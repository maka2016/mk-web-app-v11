import baseConfig from '@workspace/ui/tailwind.config';

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      keyframes: {
        ...baseConfig.theme.extend?.keyframes,
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        ...baseConfig.theme.extend?.animation,
        fadeInUp: 'fadeInUp 0.3s ease-out forwards',
      },
    },
  },
};
