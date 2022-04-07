<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@microsoft/teamsfx](./teamsfx.md) &gt; [CommandBot](./teamsfx.commandbot.md)

## CommandBot class

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

A command bot for receiving commands and sending responses in Teams.

<b>Signature:</b>

```typescript
export declare class CommandBot 
```

## Remarks

Ensure each command should ONLY be registered with the command once, otherwise it'll cause unexpected behavior if you register the same command more than once.

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(adapter, options)](./teamsfx.commandbot._constructor_.md) |  | <b><i>(BETA)</i></b> Creates a new instance of the <code>CommandBot</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [registerCommand(command)](./teamsfx.commandbot.registercommand.md) |  | <b><i>(BETA)</i></b> Registers a command into the command bot. |
|  [registerCommands(commands)](./teamsfx.commandbot.registercommands.md) |  | <b><i>(BETA)</i></b> Registers commands into the command bot. |
