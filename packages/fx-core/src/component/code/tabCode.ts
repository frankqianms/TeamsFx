// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionContext,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import * as path from "path";
import * as fs from "fs-extra";
import "reflect-metadata";
import { Service } from "typedi";
import {
  genTemplateRenderReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../common/template-utils/templatesActions";
import { convertToAlphanumericOnly } from "../../common/utils";
import { CoreQuestionNames } from "../../core/question";
import { TemplateZipFallbackError } from "../../plugins/resource/bot/v3/error";
import {
  Constants,
  FrontendPathInfo,
  DependentPluginInfo,
  FrontendPluginInfo,
  TelemetryEvent,
  Commands,
} from "../../plugins/resource/frontend/constants";
import { FrontendDeployment } from "../../plugins/resource/frontend/ops/deploy";
import {
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../../plugins/resource/frontend/resources/errors";
import { Messages } from "../../plugins/resource/frontend/resources/messages";
import { ComponentNames, ProgrammingLanguage } from "../constants";
import { getComponent } from "../workflow";
import { convertToLangKey } from "./utils";
import {
  envFilePath,
  EnvKeys,
  loadEnvFile,
  saveEnvFile,
} from "../../plugins/resource/frontend/env";
import { isVSProject } from "../../common/projectSettingsHelper";
import { DotnetCommands } from "../../plugins/resource/frontend/dotnet/constants";
import { Utils } from "../../plugins/resource/frontend/utils";
import { CommandExecutionError } from "../../plugins/resource/bot/errors";
import { ScaffoldProgress } from "../../plugins/resource/frontend/resources/steps";
import { ProgressMessages, ProgressTitles } from "../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  M365SsoLaunchPageOptionItem,
  TabNonSsoItem,
  TabOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { BadComponent } from "../error";
/**
 * tab scaffold
 */
@Service("tab-code")
export class TabCodeProvider {
  name = "tab-code";
  @hooks([
    ActionExecutionMW({
      errorSource: FrontendPluginInfo.ShortName,
      errorIssueLink: FrontendPluginInfo.IssueLink,
      errorHelpLink: FrontendPluginInfo.HelpLink,
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldTab,
      progressSteps: Object.keys(ScaffoldProgress.steps).length,
    }),
  ])
  async generate(
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    inputs.folder =
      inputs.folder ||
      (inputs[CoreQuestionNames.ProgrammingLanguage] === ProgrammingLanguage.CSharp
        ? ""
        : FrontendPathInfo.WorkingDir);
    const langKey = convertToLangKey(inputs[CoreQuestionNames.ProgrammingLanguage]);
    const workingDir = path.join(inputs.projectPath, inputs.folder);
    inputs.safeProjectName =
      inputs.safeProjectName ?? convertToAlphanumericOnly(ctx.projectSetting.appName);
    const variables = {
      ProjectName: ctx.projectSetting.appName,
      SafeProjectName: inputs.safeProjectName,
    };

    const scenario = featureToScenario.get(inputs[CoreQuestionNames.Features]);
    await actionContext?.progressBar?.next(ProgressMessages.scaffoldTab);
    await scaffoldFromTemplates({
      group: "tab",
      lang: langKey,
      scenario: scenario,
      dst: workingDir,
      fileNameReplaceFn: (name: string, data: Buffer) =>
        name.replace(/ProjectName/, ctx.projectSetting.appName).replace(/\.tpl/, ""),
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        ctx.logProvider.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            ctx.logProvider.info(Messages.FailedFetchTemplate);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipTemplateError();
          default:
            throw new UnknownScaffoldError();
        }
      },
    });
    return ok(inputs.folder);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: "tab",
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    const tabDir = teamsTab?.folder;
    if (!tabDir || !inputs.env) return ok(undefined);
    const envFile = envFilePath(inputs.env, path.join(inputs.projectPath, tabDir));
    const envs = this.collectEnvs(context);
    await saveEnvFile(envFile, { teamsfxRemoteEnvs: envs, customizedRemoteEnvs: {} });
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingTab,
      progressSteps: 1,
      errorSource: "tab",
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (!teamsTab) return ok(undefined);
    if (teamsTab.folder == undefined) throw new BadComponent("tab", this.name, "folder");
    await actionContext?.progressBar?.next(ProgressMessages.buildingTab);
    const tabPath = path.resolve(inputs.projectPath, teamsTab.folder);
    const artifactFolder = isVSProject(context.projectSetting)
      ? await this.doBlazorBuild(tabPath)
      : await this.doReactBuild(tabPath, ctx.envInfo.envName, context.telemetryReporter);
    merge(teamsTab, {
      build: true,
      artifactFolder: path.join(teamsTab.folder, artifactFolder),
    });
    return ok(undefined);
  }
  private collectEnvs(ctx: ContextV3): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };

    const teamsTab = getComponent(ctx.projectSetting, ComponentNames.TeamsTab);
    const teamsApi = getComponent(ctx.projectSetting, ComponentNames.TeamsApi);
    if (teamsApi) {
      addToEnvs(EnvKeys.FuncName, teamsApi.functionNames[0]);
      addToEnvs(
        EnvKeys.FuncEndpoint,
        ctx.envInfo?.state?.[ComponentNames.TeamsApi]?.functionEndpoint as string
      );
    }
    if (teamsTab?.sso) {
      addToEnvs(EnvKeys.ClientID, ctx.envInfo?.state?.[ComponentNames.AadApp]?.clientId as string);
      addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    }

    return envs;
  }
  private async doBlazorBuild(tabPath: string): Promise<string> {
    const command = DotnetCommands.buildRelease("win-x86");
    try {
      await Utils.execute(command, tabPath);
    } catch (e) {
      throw new CommandExecutionError(command, tabPath, e);
    }
    return path.join("bin", "Release", "net6.0", "win-x86", "publish");
  }
  private async doReactBuild(
    tabPath: string,
    envName: string,
    telemetryReporter?: TelemetryReporter
  ): Promise<string> {
    const needBuild = await FrontendDeployment.needBuild(tabPath, envName);
    if (!needBuild) {
      return "build";
    }

    const scripts = async () =>
      (await fs.readJSON(path.join(tabPath, FrontendPathInfo.NodePackageFile))).scripts ?? [];

    if (!("install:teamsfx" in scripts)) {
      // * Track legacy projects
      telemetryReporter?.sendTelemetryEvent(TelemetryEvent.InstallScriptNotFound);
    }

    await Utils.execute(
      "install:teamsfx" in scripts
        ? Commands.InstallNodePackages
        : Commands.DefaultInstallNodePackages,
      tabPath
    );

    if ("build:teamsfx" in scripts) {
      await Utils.execute(Commands.BuildFrontend, tabPath, {
        TEAMS_FX_ENV: envName,
      });
    } else {
      const envs = await loadEnvFile(envFilePath(envName, tabPath));
      await Utils.execute(Commands.DefaultBuildFrontend, tabPath, {
        ...envs.customizedRemoteEnvs,
        ...envs.teamsfxRemoteEnvs,
      });
    }

    await FrontendDeployment.saveDeploymentInfo(tabPath, envName, {
      lastBuildTime: new Date().toISOString(),
    });
    return "build";
  }
}

enum Scenario {
  default = "default",
  nonSso = "non-sso",
  m365 = "m365",
}

const featureToScenario = new Map<string, Scenario>([
  [TabOptionItem.id, Scenario.default],
  [TabNonSsoItem.id, Scenario.nonSso],
  [M365SsoLaunchPageOptionItem.id, Scenario.m365],
]);
