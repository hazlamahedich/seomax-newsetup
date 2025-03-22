// Type definitions for langchain modules
declare module 'langchain/chat_models/openai' {
  export class ChatOpenAI {
    constructor(options: any);
    invoke(input: any): Promise<any>;
  }
}

declare module 'langchain/prompts' {
  export class PromptTemplate {
    constructor(options: any);
    format(variables: any): Promise<string>;
  }
}

declare module 'langchain/schema/output_parser' {
  export class StringOutputParser {
    constructor();
    parse(text: string): Promise<string>;
  }
}

declare module 'langchain/schema/runnable' {
  export class RunnableSequence {
    static from(components: any[]): any;
  }
}

declare module 'langchain/output_parsers' {
  export class StructuredOutputParser {
    static fromZodSchema(schema: any): StructuredOutputParser;
    parse(text: string): Promise<any>;
  }
}
