import type {
  AuthoringParameterDescriptor,
  AuthoringValueState,
} from "../contracts/types";

export type AuthoringInputResolution = {
  state: AuthoringValueState;
  normalizedValue: string | null;
  message?: string | null;
};

function roundToStep(value: number, step: number, min?: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const base = Number.isFinite(min ?? NaN) ? (min as number) : 0;
  const steps = Math.round((value - base) / step);
  return base + steps * step;
}

function decimalPlaces(step?: number): number {
  if (!step || Number.isInteger(step)) return 0;
  const normalized = String(step);
  const [, fraction = ""] = normalized.split(".");
  return fraction.length;
}

function formatNumericValue(value: number, step?: number): string {
  const places = decimalPlaces(step);
  return places > 0 ? value.toFixed(places) : String(Math.round(value));
}

export function resolveAuthoringInput(
  descriptor: AuthoringParameterDescriptor,
  rawInput: string
): AuthoringInputResolution {
  const value = rawInput.trim();

  if (!value.length) {
    if (descriptor.nullable) {
      return {
        state: "coerced",
        normalizedValue: "",
        message: "Empty value accepted because the parameter is nullable.",
      };
    }
    return {
      state: "invalid",
      normalizedValue: null,
      message: "Value is required.",
    };
  }

  if (descriptor.valueKind === "number" || descriptor.valueKind === "length") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return {
        state: "invalid",
        normalizedValue: null,
        message: "Expected a numeric value.",
      };
    }
    let next = parsed;
    let state: AuthoringValueState = "valid";
    if (typeof descriptor.step === "number" && descriptor.step > 0) {
      const stepped = roundToStep(next, descriptor.step, descriptor.min);
      if (stepped !== next) {
        next = stepped;
        state = "coerced";
      }
    }
    if (typeof descriptor.min === "number" && next < descriptor.min) {
      next = descriptor.min;
      state = "clamped";
    }
    if (typeof descriptor.max === "number" && next > descriptor.max) {
      next = descriptor.max;
      state = "clamped";
    }
    return {
      state,
      normalizedValue: formatNumericValue(next, descriptor.step),
      message:
        state === "clamped"
          ? "Value was clamped into the allowed range."
          : state === "coerced"
            ? "Value was aligned to the allowed step."
            : null,
    };
  }

  if (descriptor.valueKind === "boolean") {
    const lowered = value.toLowerCase();
    if (["true", "1", "yes", "on"].includes(lowered)) {
      return { state: "coerced", normalizedValue: "true", message: "Boolean value normalized to true." };
    }
    if (["false", "0", "no", "off"].includes(lowered)) {
      return { state: "coerced", normalizedValue: "false", message: "Boolean value normalized to false." };
    }
    return {
      state: "invalid",
      normalizedValue: null,
      message: "Expected a boolean value.",
    };
  }

  if (descriptor.valueKind === "color") {
    const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    if (!isHex) {
      return {
        state: "invalid",
        normalizedValue: null,
        message: "Expected a hex color like #RRGGBB.",
      };
    }
    return {
      state: value === value.toLowerCase() ? "valid" : "coerced",
      normalizedValue: value.toLowerCase(),
      message: value === value.toLowerCase() ? null : "Color value normalized to lowercase hex.",
    };
  }

  if (descriptor.valueKind === "enum" || descriptor.valueKind === "token-ref") {
    const options = descriptor.options ?? [];
    if (!options.length) {
      return {
        state: descriptor.valueKind === "token-ref" ? "unresolved" : "invalid",
        normalizedValue: null,
        message:
          descriptor.valueKind === "token-ref"
            ? "Token reference options are not available yet."
            : "Enum options are not available.",
      };
    }
    const matched = options.find((option) => option.value === value);
    if (!matched) {
      return {
        state: "invalid",
        normalizedValue: null,
        message: "Value is not one of the allowed options.",
      };
    }
    return {
      state: "valid",
      normalizedValue: matched.value,
      message: null,
    };
  }

  return {
    state: "valid",
    normalizedValue: value,
    message: null,
  };
}
