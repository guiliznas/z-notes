import React, { type ReactNode } from "react";

function pass<T extends Record<string, unknown>>(props: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in props) {
    const v = props[k];
    if (typeof v === "function") continue;
    if (k === "style" || k === "numberOfLines" || k === "autoCapitalize" || k === "autoCorrect" || k === "secureTextEntry" || k === "placeholderTextColor" || k === "textAlignVertical" || k === "autoFocus" || k === "multiline" || k === "elevation") continue;
    out[k] = v;
  }
  return out;
}

export const View = ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) =>
  React.createElement("div", pass(rest), children);

export const Text = ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) =>
  React.createElement("span", pass(rest), children);

interface TextInputProps {
  value?: string;
  onChangeText?: (v: string) => void;
  secureTextEntry?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps & Record<string, unknown>>(
  (props, ref) => {
    const onChange = (e: { target: { value: string } }) => {
      const cb = props.onChangeText as ((v: string) => void) | undefined;
      if (cb) cb(e.target.value);
    };
    return React.createElement("input", {
      ref,
      type: String(props.secureTextEntry) === "true" ? "password" : "text",
      value: props.value,
      onChange,
      placeholder: props.placeholder as string | undefined,
    });
  },
);

export const TouchableOpacity = ({ children, onPress, ...rest }: { children?: ReactNode; onPress?: () => void } & Record<string, unknown>) =>
  React.createElement("button", { onClick: onPress, ...pass(rest) }, children);

export const FlatList = <T,>({ data, keyExtractor, renderItem, ListEmptyComponent }: {
  data: T[] | undefined;
  keyExtractor: (item: T) => string;
  renderItem: ({ item }: { item: T }) => ReactNode;
  ListEmptyComponent?: ReactNode;
}) =>
  React.createElement(
    "div",
    { "data-testid": "flatlist" },
    (!data || data.length === 0) && ListEmptyComponent,
    (data ?? []).map((item, i) =>
      React.createElement("div", { key: keyExtractor(item), "data-index": i }, renderItem({ item })),
    ),
  );

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export const Alert = {
  alert: () => {},
};

export const StatusBar = () => null;
