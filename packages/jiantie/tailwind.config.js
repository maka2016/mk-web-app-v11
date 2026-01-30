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
        arrowing: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(10px)',
          },
        },
        'arrowing-horizontal': {
          '0%, 100%': {
            transform: 'translateX(0)',
          },
          '50%': {
            transform: 'translateX(-10px)',
          },
        },
        'arrowing-left': {
          '0%, 100%': {
            transform: 'rotate(-90deg) translateX(0)',
          },
          '50%': {
            transform: 'rotate(-90deg) translateX(-10px)',
          },
        },
        'arrowing-right': {
          '0%, 100%': {
            transform: 'rotate(-90deg) translateX(0)',
          },
          '50%': {
            transform: 'rotate(-90deg) translateX(-10px)',
          },
        },
      },
      animation: {
        ...baseConfig.theme.extend?.animation,
        fadeInUp: 'fadeInUp 0.3s ease-out forwards',
        arrowing: 'arrowing 1.5s infinite',
        'arrowing-horizontal': 'arrowing-horizontal 1.5s infinite',
        'arrowing-left': 'arrowing-left 1.5s infinite',
        'arrowing-right': 'arrowing-right 1.5s infinite',
      },
    },
  },
};
