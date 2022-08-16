// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsCheckerEvent } from "./constant/telemetry";

export interface DepsTelemetry {
  sendEvent(
    eventName: DepsCheckerEvent,
    properties?: { [p: string]: string },
    timecost?: number
  ): void;

  sendEventWithDuration(eventName: DepsCheckerEvent, action: () => Promise<void>): Promise<void>;

  sendUserErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    properties?: { [key: string]: string }
  ): void;

  sendSystemErrorEvent(
    eventName: DepsCheckerEvent,
    errorMessage: string,
    errorStack: string,
    properties?: { [key: string]: string }
  ): void;
}
