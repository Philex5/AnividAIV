export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type ResolutionConstraint = string | string[];

export type QuantityConstraint =
  | number
  | number[]
  | {
      min?: number;
      max?: number;
    };

export type TranslateFn = (key: string) => string;

export interface GeneratorModalCopy {
  title: string;
  description?: string;
  labels: {
    model: string;
    style: string;
    prompt: string;
    quantity: string;
    resolution: string;
    reference: string;
    status: string;
    results: string;
  };
  placeholders: {
    model: string;
    style: string;
    prompt: string;
    resolution: string;
    reference: string;
  };
  actions: {
    submit: string;
    cancel: string;
  };
  status: {
    idle: string;
    submitting: string;
    polling: string;
    completed: string;
    failed: string;
    emptyResults: string;
    loadingOptions: string;
    loadFailed: string;
  };
  errors: {
    missingPrompt: string;
    missingModel: string;
    missingResolution: string;
    missingEventTitle?: string;
    missingEventContent?: string;
    requestFailed: string;
    missingTemplate?: string;
    missingTemplateParams?: string;
  };
}
