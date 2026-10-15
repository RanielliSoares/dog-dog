/* Tokens do design system Doc & Dog 24h (compartilhado entre as páginas) */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        "surface": "#fbf8ff",
        "on-secondary-container": "#00714d",
        "primary": "#003530",
        "error-container": "#ffdad6",
        "surface-container-highest": "#e3e1ec",
        "on-secondary-fixed": "#002113",
        "on-primary-fixed": "#00201d",
        "on-primary": "#ffffff",
        "secondary-container": "#6cf8bb",
        "on-error-container": "#93000a",
        "secondary-fixed": "#6ffbbe",
        "on-primary-container": "#84bdb5",
        "tertiary-container": "#204c40",
        "secondary": "#006c49",
        "vitality": "#10b981",
        "on-surface-variant": "#404947",
        "surface-container-low": "#f4f2fd",
        "primary-container": "#0d4d47",
        "outline": "#707977",
        "surface-container": "#eeedf7",
        "surface-container-high": "#e8e7f1",
        "tertiary-fixed-dim": "#a2d0c0",
        "on-surface": "#1a1b22",
        "tertiary-fixed": "#bdecdc",
        "tertiary": "#03352a",
        "secondary-fixed-dim": "#4edea3",
        "primary-fixed": "#b4eee5",
        "on-secondary": "#ffffff",
        "outline-variant": "#bfc8c6",
        "surface-container-lowest": "#ffffff",
        "primary-fixed-dim": "#98d1c9",
        "error": "#ba1a1a"
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
      fontFamily: { "sans": ["Plus Jakarta Sans", "system-ui", "sans-serif"] },
      fontSize: {
        "label-caps": ["11px", { "lineHeight": "16px", "letterSpacing": "0.08em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "400" }],
        "body-md": ["15px", { "lineHeight": "24px", "letterSpacing": "-0.005em", "fontWeight": "400" }],
        "label-lg": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "600" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "display-hero-mobile": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.025em", "fontWeight": "700" }],
        "body-sm": ["13px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "headline-lg": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.025em", "fontWeight": "600" }],
        "headline-md-mobile": ["22px", { "lineHeight": "28px", "letterSpacing": "-0.015em", "fontWeight": "600" }],
        "display-hero": ["56px", { "lineHeight": "64px", "letterSpacing": "-0.03em", "fontWeight": "700" }],
        "headline-md": ["28px", { "lineHeight": "36px", "letterSpacing": "-0.02em", "fontWeight": "600" }]
      }
    }
  }
};
