declare module 'mammoth/mammoth.browser.js' {
  type ConversionResult = {
    messages: Array<{ message: string; type: 'warning' | 'error' }>;
    value: string;
  };

  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
}
