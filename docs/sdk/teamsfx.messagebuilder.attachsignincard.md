<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@microsoft/teamsfx](./teamsfx.md) &gt; [MessageBuilder](./teamsfx.messagebuilder.md) &gt; [attachSigninCard](./teamsfx.messagebuilder.attachsignincard.md)

## MessageBuilder.attachSigninCard() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Returns an attachment for a sign-in card.

<b>Signature:</b>

```typescript
static attachSigninCard(title: string, url: string, text?: string): Partial<Activity>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  title | string | The title for the card's sign-in button. |
|  url | string | The URL of the sign-in page to use. |
|  text | string | Optional. Additional text to include on the card. |

<b>Returns:</b>

Partial&lt;Activity&gt;

A bot message activity attached with a sign-in card.

## Remarks

For channels that don't natively support sign-in cards, an alternative message is rendered.
