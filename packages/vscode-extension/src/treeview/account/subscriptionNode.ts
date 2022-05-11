// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";

import { SubscriptionInfo } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";

import AzureAccountManager from "../../commonlib/azureLogin";
import { ext } from "../../extensionVariables";
import { getWorkspacePath } from "../../handlers";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";

export class SubscriptionNode extends DynamicNode {
  private subscription?: SubscriptionInfo;
  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
  }

  public async getChildren(): Promise<DynamicNode[] | undefined | null> {
    return null;
  }

  public async getTreeItem(): Promise<vscode.TreeItem> {
    if (this.subscription) {
      this.label = this.subscription.subscriptionName;
      this.tooltip = this.subscription.subscriptionName;
      this.contextValue = "selectSubscription";
      this.iconPath = {
        light: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "subscriptionSelected-light.svg"
        ),
        dark: path.join(
          ext.context.extensionPath,
          "media",
          "treeview",
          "account",
          "subscriptionSelected-dark.svg"
        ),
      };
    }
    return this;
  }

  public async setSubscription(subscription: SubscriptionInfo) {
    this.subscription = subscription;
    await AzureAccountManager.setSubscription(subscription.subscriptionId);
    this.eventEmitter.fire(this);
  }

  public unsetSubscription(subscriptionCount: number) {
    this.subscription = undefined;
    this.label = util.format(
      localize("teamstoolkit.accountTree.totalSubscriptions"),
      subscriptionCount
    );
    this.tooltip = undefined;
    this.contextValue = "selectSubscription";
    this.iconPath = {
      light: path.join(
        ext.context.extensionPath,
        "media",
        "treeview",
        "account",
        "subscriptions-light.svg"
      ),
      dark: path.join(
        ext.context.extensionPath,
        "media",
        "treeview",
        "account",
        "subscriptions-dark.svg"
      ),
    };
    this.eventEmitter.fire(this);
  }

  public setEmptySubscription() {
    const validProject = isValidProject(getWorkspacePath());
    this.contextValue = validProject ? "emptySubscription" : "invalidFxProject";
    this.label = localize("teamstoolkit.accountTree.noSubscriptions");
    this.tooltip = localize("teamstoolkit.accountTree.noSubscriptionsTooltip");
    this.iconPath = {
      light: path.join(
        ext.context.extensionPath,
        "media",
        "treeview",
        "account",
        "warning-light.svg"
      ),
      dark: path.join(
        ext.context.extensionPath,
        "media",
        "treeview",
        "account",
        "warning-dark.svg"
      ),
    };
  }
}