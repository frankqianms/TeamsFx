<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@microsoft/teamsfx](./teamsfx.md) &gt; [BotSsoConfig](./teamsfx.botssoconfig.md)

## BotSsoConfig interface

Interface for SSO configuration for Bot SSO

<b>Signature:</b>

```typescript
export interface BotSsoConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [aad](./teamsfx.botssoconfig.aad.md) | { scopes: string\[\]; } &amp; [AuthenticationConfiguration](./teamsfx.authenticationconfiguration.md) | aad related configurations |
|  [dialog?](./teamsfx.botssoconfig.dialog.md) | { CustomBotSsoExecutionActivityHandler?: new (ssoConfig: [BotSsoConfig](./teamsfx.botssoconfig.md)<!-- -->) =&gt; [BotSsoExecutionActivityHandler](./teamsfx.botssoexecutionactivityhandler.md)<!-- -->; conversationState?: ConversationState; userState?: UserState; dedupStorage?: Storage; ssoPromptConfig?: { timeout?: number; endOnInvalidMessage?: boolean; }; } | <i>(Optional)</i> |
