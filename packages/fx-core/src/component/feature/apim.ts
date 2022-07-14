// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  Component,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  IProgressHandler,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { hasApi } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import { buildAnswer } from "../../plugins/resource/apim/answer";
import { ApimPluginConfig } from "../../plugins/resource/apim/config";
import {
  PluginLifeCycle,
  ProgressMessages,
  ProgressStep,
} from "../../plugins/resource/apim/constants";
import { Factory } from "../../plugins/resource/apim/factory";
import { ComponentNames } from "../constants";
import { getComponent } from "../workflow";

@Service(ComponentNames.APIMFeature)
export class ApimFeature {
  name = ComponentNames.APIMFeature;
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const component = getComponent(context.projectSetting, ComponentNames.APIM);
    if (component) return ok(undefined);
    const hasFunc = hasApi(context.projectSetting);
    const dependentActions: Action[] = [];
    if (!hasFunc) {
      dependentActions.push({
        name: "call:teams-api.add",
        type: "call",
        required: true,
        targetAction: "teams-api.add",
      });
    }
    const actions: Action[] = [
      ...dependentActions,
      {
        name: "apim-feature.configApim",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const component = getComponent(context.projectSetting, ComponentNames.APIM);
          if (component) return ok([]);
          return ok(["add component 'apim' in projectSettings"]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const component = getComponent(context.projectSetting, ComponentNames.APIM);
          if (component) return ok([]);
          const remarks: string[] = ["add component 'apim' in projectSettings"];
          const apimConfig: Component = {
            name: ComponentNames.APIM,
            provision: true,
            deploy: true,
            connections: [],
          };
          context.projectSetting.components.push(apimConfig);
          const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
          if (teamsTab) {
            apimConfig.connections?.push("teams-tab");
          }
          const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
          if (teamsBot) {
            apimConfig.connections?.push("teams-bot");
          }
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
        },
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: "call:apim-feature.generateCode",
        type: "call",
        required: true,
        targetAction: "apim-feature.generateCode",
      },
      {
        name: "call:apim.generateBicep",
        type: "call",
        required: true,
        targetAction: "apim.generateBicep",
      },
      {
        name: "call:apim-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "apim-config.generateBicep",
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "apim-feature.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }

  generateCode(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "apim-feature.generateCode",
      type: "function",
      errorSource: "APIM",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: "scaffold",
      enableProgressBar: true,
      progressTitle: ProgressStep.Scaffold,
      progressSteps: Object.keys(ProgressMessages[ProgressStep.Scaffold]).length,
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([ProgressStep.Scaffold]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler
      ) => {
        const remarks: string[] = [ProgressStep.Scaffold];
        const apimConfig = new ApimPluginConfig({}, "");
        const answer = buildAnswer(inputs);
        const scaffoldManager = await Factory.buildScaffoldManager(
          context.telemetryReporter,
          context.logProvider
        );
        const appName = convertToAlphanumericOnly(context.projectSetting.appName);
        if (answer.validate) {
          await answer.validate(PluginLifeCycle.Scaffold, apimConfig, inputs.projectPath);
        }
        answer.save(PluginLifeCycle.Scaffold, apimConfig);
        progress?.next(ProgressMessages[ProgressStep.Scaffold].Scaffold);
        await scaffoldManager.scaffold(appName, inputs.projectPath);
        return ok(remarks);
      },
    };
    return ok(action);
  }
}
