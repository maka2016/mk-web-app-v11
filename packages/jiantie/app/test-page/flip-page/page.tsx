'use client';

import { useState } from 'react';

export default function FlipCardTestPage() {
  const [flipped1, setFlipped1] = useState(false);
  const [flipped2, setFlipped2] = useState(false);
  const [flipped3, setFlipped3] = useState(false);

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-8'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-4xl font-bold text-center mb-4 text-gray-800'>
          CSS 3D 卡片翻转测试
        </h1>
        <p className='text-center mb-12 text-gray-600'>点击卡片查看翻转效果</p>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {/* 卡片 1: Y轴翻转 */}
          <div className='flex flex-col items-center'>
            <h3 className='text-lg font-semibold mb-4 text-gray-700'>
              Y轴翻转（左右翻转）
            </h3>
            <div
              className='flip-card w-80 h-96 cursor-pointer'
              onClick={() => setFlipped1(!flipped1)}
            >
              <div
                className={`flip-card-inner ${flipped1 ? 'flip-card-flipped' : ''}`}
              >
                {/* 正面 */}
                <div className='flip-card-front bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>🎨</div>
                  <h2 className='text-3xl font-bold mb-4'>正面</h2>
                  <p className='text-center text-lg'>点击卡片查看背面内容</p>
                </div>
                {/* 背面 */}
                <div className='flip-card-back bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>✨</div>
                  <h2 className='text-3xl font-bold mb-4'>背面</h2>
                  <p className='text-center text-lg'>这是卡片的背面内容</p>
                </div>
              </div>
            </div>
          </div>

          {/* 卡片 2: X轴翻转 */}
          <div className='flex flex-col items-center'>
            <h3 className='text-lg font-semibold mb-4 text-gray-700'>
              X轴翻转（上下翻转）
            </h3>
            <div
              className='flip-card-x w-80 h-96 cursor-pointer'
              onClick={() => setFlipped2(!flipped2)}
            >
              <div
                className={`flip-card-inner-x ${flipped2 ? 'flip-card-flipped-x' : ''}`}
              >
                {/* 正面 */}
                <div className='flip-card-front-x bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>🚀</div>
                  <h2 className='text-3xl font-bold mb-4'>正面</h2>
                  <p className='text-center text-lg'>X轴翻转效果</p>
                </div>
                {/* 背面 */}
                <div className='flip-card-back-x bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>🌟</div>
                  <h2 className='text-3xl font-bold mb-4'>背面</h2>
                  <p className='text-center text-lg'>上下翻转的背面</p>
                </div>
              </div>
            </div>
          </div>

          {/* 卡片 3: 悬停翻转 */}
          <div className='flex flex-col items-center'>
            <h3 className='text-lg font-semibold mb-4 text-gray-700'>
              悬停翻转（Hover）
            </h3>
            <div className='flip-card-hover w-80 h-96 cursor-pointer'>
              <div className='flip-card-inner-hover'>
                {/* 正面 */}
                <div className='flip-card-front-hover bg-gradient-to-br from-yellow-400 to-red-500 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>🎯</div>
                  <h2 className='text-3xl font-bold mb-4'>正面</h2>
                  <p className='text-center text-lg'>悬停查看背面</p>
                </div>
                {/* 背面 */}
                <div className='flip-card-back-hover bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'>
                  <div className='text-6xl mb-4'>💎</div>
                  <h2 className='text-3xl font-bold mb-4'>背面</h2>
                  <p className='text-center text-lg'>这是悬停触发的效果</p>
                </div>
              </div>
            </div>
          </div>

          {/* 卡片 4: 信息卡片 */}
          <div className='flex flex-col items-center'>
            <h3 className='text-lg font-semibold mb-4 text-gray-700'>
              信息卡片示例
            </h3>
            <div
              className='flip-card w-80 h-96 cursor-pointer'
              onClick={() => setFlipped3(!flipped3)}
            >
              <div
                className={`flip-card-inner ${flipped3 ? 'flip-card-flipped' : ''}`}
              >
                {/* 正面 */}
                <div className='flip-card-front bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center'>
                  <div className='w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 flex items-center justify-center text-white text-4xl'>
                    👤
                  </div>
                  <h2 className='text-2xl font-bold mb-2 text-gray-800'>
                    张三
                  </h2>
                  <p className='text-gray-600 mb-4'>前端工程师</p>
                  <div className='text-sm text-gray-500'>点击查看详情</div>
                </div>
                {/* 背面 */}
                <div className='flip-card-back bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col justify-center text-white'>
                  <h3 className='text-xl font-bold mb-4'>联系方式</h3>
                  <div className='space-y-3'>
                    <div className='flex items-center gap-3'>
                      <span className='text-2xl'>📧</span>
                      <span>zhangsan@example.com</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-2xl'>📱</span>
                      <span>+86 138 0000 0000</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-2xl'>📍</span>
                      <span>北京市朝阳区</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-2xl'>💼</span>
                      <span>5年工作经验</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Y轴翻转（左右翻转）*/
        .flip-card {
          perspective: 1000px;
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flip-card-flipped {
          transform: rotateY(180deg);
        }

        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flip-card-back {
          transform: rotateY(180deg);
        }

        /* X轴翻转（上下翻转）*/
        .flip-card-x {
          perspective: 1000px;
        }

        .flip-card-inner-x {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flip-card-flipped-x {
          transform: rotateX(180deg);
        }

        .flip-card-front-x,
        .flip-card-back-x {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flip-card-back-x {
          transform: rotateX(180deg);
        }

        /* 悬停翻转 */
        .flip-card-hover {
          perspective: 1000px;
        }

        .flip-card-inner-hover {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flip-card-hover:hover .flip-card-inner-hover {
          transform: rotateY(180deg);
        }

        .flip-card-front-hover,
        .flip-card-back-hover {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flip-card-back-hover {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
