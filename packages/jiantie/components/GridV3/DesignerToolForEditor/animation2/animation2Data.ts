export const animation2Data = {
  text: {
    entrance: [
      {
        id: 'text-entrance-print',
        name: '印刷',
        parameters: {
          opacity: { from: 0, to: 1, duration: 100 },
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-rise',
        name: '上升',
        parameters: {
          y: ['100%', '0%'],
          opacity: [0, 1],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-shift',
        name: '移位',
        parameters: {
          y: ['-100%', '0%'],
          opacity: [0, 1],

          ease: 'inBack',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-burst',
        name: '爆裂',
        parameters: {
          scale: [1, 1.25, 1],
          opacity: [0, 0.5, 1],
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-bounce',
        name: '弹跳',
        parameters: {
          y: ['0%', '-30%', '-15%', '0%', '-4%', '0%'],
          scaleY: [1, 1.1, 1.05, 0.95, 1.02, 1],
          opacity: [0, 1],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-flip',
        name: '翻转',
        parameters: {
          y: [
            { to: '-100%', duration: 100 },
            { to: '0%', duration: 100 },
            { to: '100%', duration: 50 },
            { to: '0%', duration: 100 },
          ],
          opacity: [0, 1],
          ease: 'outQuad',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-entrance-slide',
        name: '滑动',
        parameters: {
          x: ['100%', '0%'],
          y: ['-50%', '0'],
          rotate: ['-45deg', '0deg'],
          opacity: [0, 1],
        },
        delay: 50,
        type: 'text',
      },
    ],
    emphasis: [],
    exit: [
      {
        id: 'text-exit-print',
        name: '印刷',
        parameters: {
          opacity: [1, 0],
          duration: 1,
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-rise',
        name: '上升',
        parameters: {
          y: ['0%', '-150%'],
          opacity: [1, 0],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-shift',
        name: '移位',
        parameters: {
          y: ['0', '100%'],
          opacity: [1, 0],
          ease: 'inBack',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-burst',
        name: '爆裂',
        parameters: {
          scale: [1, 1.25, 1],
          opacity: [1, 0.5, 0],
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-bounce',
        name: '弹跳',
        parameters: {
          y: ['0%', '-30%', '-15%', '0%', '-4%', '0%'],
          scaleY: [1, 1.1, 1.05, 0.95, 1.02, 1],
          opacity: [1, 0],
          ease: 'inOut',
        },
        delay: 100,
        type: 'text',
      },
      {
        id: 'text-exit-flip',
        name: '翻转',
        parameters: {
          y: [
            { to: '-100%', duration: 100 },
            { to: '0%', duration: 100 },
            { to: '100%', duration: 50 },
            { to: '0%', duration: 100 },
          ],
          opacity: [1, 0.2, 0, 0],
        },
        delay: 100,
        type: 'text',
      },
    ],
  },
  common: {
    entrance: [
      {
        id: 'common-entrance-rise',
        name: '上升',
        parameters: {
          opacity: [0, 1],
          y: ['100%', '0%'],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-fall',
        name: '下降',
        parameters: {
          opacity: [0, 1],
          y: ['-100%', '0%'],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-slide-left',
        name: '向左平移',
        parameters: {
          opacity: [0, 1],
          x: ['100%', '0%'],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-slide-right',
        name: '向右平移',
        parameters: {
          opacity: [0, 1],
          x: ['-100%', '0%'],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-fade',
        name: '淡入',
        parameters: {
          opacity: [0, 1],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-pop',
        name: '弹出',
        parameters: {
          opacity: [0, 1],
          scale: [0, 1.1, 0.9, 1],
          ease: 'out',
          duration: 1000,
        },
      },

      {
        id: 'common-entrance-wipe',
        name: '擦除',
        parameters: {
          opacity: [0, 1],

          '-webkit-mask-image': [
            'linear-gradient(to right, black 0%, transparent 0%)',
            'linear-gradient(to right, black 100%, transparent 100%)',
          ],
          duration: 1000,
        },
      },
      {
        id: 'common-entrance-blur',
        name: '模糊',
        parameters: {
          opacity: [0, 1],
          filter: ['blur(10px)', 'blur(0px)'],
          ease: 'out',
          duration: 1000,
        },
      },

      {
        name: '底部弹出',
        id: 'common-entrance-pop-bottom',
        parameters: {
          opacity: [0, 1],
          y: ['90%', '0%'],
          duration: 500,
          '-webkit-mask-image': [
            'linear-gradient(black 0%, transparent 0%)',
            'linear-gradient(black 100%, transparent 100%)',
          ],

          ease: 'out(3)',
        },
      },
      {
        id: 'common-entrance-roll-left',
        name: '向左滚入',
        parameters: {
          opacity: [0, 1],
          x: ['200%', '0%'],
          rotate: ['90deg', '0deg'],
          duration: 500,
          ease: 'linear',
        },
      },
      {
        id: 'common-entrance-roll-right',
        name: '向右滚入',
        parameters: {
          opacity: [0, 1],
          x: ['-200%', '0%'],
          rotate: ['-90deg', '0deg'],
          duration: 500,
          ease: 'linear',
        },
      },
      {
        id: 'common-entrance-scale',
        name: '缩放',
        parameters: {
          opacity: [0, 1],
          scale: [0.3, 1],
          duration: 500,
          ease: 'linear',
        },
      },
    ],
    emphasis: [
      {
        id: 'common-emphasis-rotate',
        name: '旋转',
        parameters: {
          rotate: '1turn',
          duration: 1000,
          loop: true,
        },
      },
      {
        id: 'common-emphasis-blink',
        name: '闪烁',
        parameters: {
          opacity: ['1', '0.2', '1'],
          duration: 1000,
          loop: true,
        },
      },
      {
        id: 'common-emphasis-beat',
        name: '律动',
        parameters: {
          scale: [1, 1.1, 0.9],
          duration: 1000,
          loop: true,
        },
      },
      {
        id: 'common-emphasis-shake',
        name: '摇摆',
        parameters: {
          x: ['-10%', '10%', '10%', '-10%', '-10%'],
          y: ['-10%', '10%', '-10%', '10%', '-10%'],
          duration: 1000,
          loop: true,
        },
      },
      {
        id: 'common-emphasis-pulse',
        name: '缩放',
        parameters: {
          scale: [1, 1.05, 1],
          duration: 1000,
          loop: true,
        },
      },
    ],
    exit: [
      {
        id: 'common-exit-rise',
        name: '上升',
        parameters: {
          opacity: [1, 0],
          y: ['0%', '-100%'],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-fall',
        name: '下降',
        parameters: {
          opacity: [1, 0],
          y: ['0%', '100%'],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-slide-left',
        name: '向左平移',
        parameters: {
          opacity: [1, 0],
          x: ['0%', '-100%'],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-slide-right',
        name: '向右平移',
        parameters: {
          opacity: [1, 0],
          x: ['0%', '100%'],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-fade',
        name: '淡出',
        parameters: {
          opacity: [1, 0],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-pop',
        name: '弹出',
        parameters: {
          scale: [1, 1.1, 0],
          ease: 'in',
          duration: 1000,
        },
      },

      {
        id: 'common-exit-wipe',
        name: '擦除',
        parameters: {
          '-webkit-mask-image': [
            'linear-gradient(to left, black 100%, transparent 100%)',
            'linear-gradient(to left, black 0%, transparent 0%)',
          ],
          duration: 1000,
        },
      },
      {
        id: 'common-exit-blur',
        name: '模糊',
        parameters: {
          opacity: [1, 0],
          filter: ['blur(0px)', 'blur(10px)'],
          ease: 'out',
          duration: 1000,
        },
      },

      {
        name: '底部弹出',
        id: 'common-exit-pop-bottom',
        parameters: {
          opacity: [0, 1],
          y: ['0%', '100%'],
          duration: 500,
          '-webkit-mask-image': [
            'linear-gradient(black 100%, transparent 100%)',
            'linear-gradient(black 0%, transparent 0%)',
          ],

          ease: 'out(3)',
        },
      },

      {
        id: 'common-exit-roll-left',
        name: '向左滚出',
        parameters: {
          opacity: [0, 1],
          x: ['0%', '-200%'],
          rotate: ['0deg', '-90deg'],
          duration: 500,
          ease: 'linear',
        },
      },
      {
        id: 'common-exit-roll-right',
        name: '向右滚出',
        parameters: {
          opacity: [1, 0],
          x: ['0%', '200%'],
          rotate: ['0deg', '90deg'],
          duration: 500,
          ease: 'linear',
        },
      },
      {
        id: 'common-exit-scale',
        name: '缩放',
        parameters: {
          opacity: [1, 0],
          scale: [1, 0.3],
          duration: 500,
          ease: 'linear',
        },
      },
    ],
  },
};
