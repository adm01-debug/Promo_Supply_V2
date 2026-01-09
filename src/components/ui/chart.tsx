import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

// Dark mode aware chart palette
export const chartPalette = {
  primary: {
    light: "hsl(221.2 83.2% 53.3%)",
    dark: "hsl(217.2 91.2% 59.8%)",
  },
  success: {
    light: "hsl(142.1 76.2% 36.3%)",
    dark: "hsl(142.1 70.6% 45.3%)",
  },
  warning: {
    light: "hsl(45.4 93.4% 47.5%)",
    dark: "hsl(45.4 93.4% 52.5%)",
  },
  danger: {
    light: "hsl(0 84.2% 60.2%)",
    dark: "hsl(0 72.2% 50.6%)",
  },
  purple: {
    light: "hsl(262.1 83.3% 57.8%)",
    dark: "hsl(263.4 70% 50.4%)",
  },
  blue: {
    light: "hsl(199.2 89.4% 48.4%)",
    dark: "hsl(199.2 95.5% 53.8%)",
  },
  cyan: {
    light: "hsl(174.6 83.9% 31.6%)",
    dark: "hsl(174.6 95.8% 41.4%)",
  },
  pink: {
    light: "hsl(330.4 81.2% 60.4%)",
    dark: "hsl(330.4 81.2% 65.4%)",
  },
} as const;

// Extended dark mode chart colors for better visibility
export const darkModeChartColors = [
  "hsl(217 91% 60%)",      // Blue
  "hsl(142 71% 45%)",      // Green  
  "hsl(45 93% 52%)",       // Yellow
  "hsl(0 72% 51%)",        // Red
  "hsl(263 70% 50%)",      // Purple
  "hsl(199 96% 54%)",      // Cyan
  "hsl(330 81% 65%)",      // Pink
  "hsl(25 95% 53%)",       // Orange
];

export const lightModeChartColors = [
  "hsl(221 83% 53%)",      // Blue
  "hsl(142 76% 36%)",      // Green
  "hsl(45 93% 47%)",       // Yellow
  "hsl(0 84% 60%)",        // Red
  "hsl(262 83% 58%)",      // Purple
  "hsl(199 89% 48%)",      // Cyan
  "hsl(330 81% 60%)",      // Pink
  "hsl(25 95% 50%)",       // Orange
];

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          // Base styles
          "flex aspect-video justify-center text-xs",
          // Axis text
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-axis-tick_text]:text-[11px]",
          // Grid lines - more visible in dark mode
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "dark:[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/30",
          // Tooltip cursor
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          // Dots
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-active-dot]:drop-shadow-md",
          "dark:[&_.recharts-active-dot]:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
          // Layers
          "[&_.recharts-layer]:outline-none",
          // Polar grid
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "dark:[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border/50",
          // Radial bar
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "dark:[&_.recharts-radial-bar-background-sector]:fill-muted/50",
          // Tooltip rectangle
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "dark:[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/30",
          // Reference line
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          // Sectors
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-sector]:outline-none",
          "dark:[&_.recharts-sector]:drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]",
          // Surface
          "[&_.recharts-surface]:outline-none",
          // Legend
          "[&_.recharts-legend-item-text]:!text-foreground",
          // Dark mode glow effects
          "dark:[&_.recharts-area]:drop-shadow-[0_0_12px_rgba(var(--primary),0.2)]",
          "dark:[&_.recharts-bar]:drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
          "dark:[&_.recharts-line]:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles with better dark mode support
          "grid min-w-[8rem] items-start gap-1.5 rounded-xl text-xs",
          // Light mode
          "border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl",
          // Dark mode - more pronounced tooltip
          "dark:border-border/40 dark:bg-popover/95 dark:shadow-2xl dark:shadow-black/20",
          // Glow effect in dark mode
          "dark:ring-1 dark:ring-white/5",
          "px-3 py-2.5",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            // Add glow in dark mode
                            "dark:shadow-[0_0_4px_var(--color-bg)]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-semibold tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4 flex-wrap",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 text-sm",
              "[&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
              "transition-opacity hover:opacity-80 cursor-default"
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  // Glow effect in dark mode
                  "dark:shadow-[0_0_4px_currentColor]"
                )}
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            <span className="text-muted-foreground">{itemConfig?.label}</span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

// Utility hook for getting theme-aware chart colors
export function useChartTheme() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
  }, []);

  return {
    isDark,
    colors: isDark ? darkModeChartColors : lightModeChartColors,
    getColor: (index: number) => {
      const colors = isDark ? darkModeChartColors : lightModeChartColors;
      return colors[index % colors.length];
    },
    palette: chartPalette,
  };
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
