import React from 'react';
import { Input } from '../Input/Input';
import type { InputProps } from '../Input/Input';
import { Textarea } from '../Textarea/Textarea';
import type { TextareaProps } from '../Textarea/Textarea';
import { Select } from '../Select/Select';
import type { SelectProps } from '../Select/Select';

type BaseFormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
};

type FormFieldInputProps = BaseFormFieldProps & {
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'url';
} & Omit<InputProps, 'label' | 'required' | 'error' | 'helperText'>;

type FormFieldTextareaProps = BaseFormFieldProps & {
  type: 'textarea';
} & Omit<TextareaProps, 'label' | 'required' | 'error' | 'helperText'>;

type FormFieldSelectProps = BaseFormFieldProps & {
  type: 'select';
} & Omit<SelectProps, 'label' | 'required' | 'error' | 'helperText'>;

export type FormFieldProps = FormFieldInputProps | FormFieldTextareaProps | FormFieldSelectProps;

export const FormField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>((props, ref) => {
  const { type, label, required = false, error, helperText, ...restProps } = props;

  const commonProps = {
    label,
    required,
    error,
    helperText,
  };

  if (type === 'textarea') {
    return (
      <Textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        {...commonProps}
        {...(restProps as Omit<TextareaProps, 'label' | 'required' | 'error' | 'helperText'>)}
      />
    );
  }

  if (type === 'select') {
    return (
      <Select
        ref={ref as React.Ref<HTMLSelectElement>}
        {...commonProps}
        {...(restProps as Omit<SelectProps, 'label' | 'required' | 'error' | 'helperText'>)}
      />
    );
  }

  // Default to Input for all other types
  return (
    <Input
      ref={ref as React.Ref<HTMLInputElement>}
      type={type}
      {...commonProps}
      {...(restProps as Omit<InputProps, 'label' | 'required' | 'error' | 'helperText' | 'type'>)}
    />
  );
});

FormField.displayName = 'FormField';
