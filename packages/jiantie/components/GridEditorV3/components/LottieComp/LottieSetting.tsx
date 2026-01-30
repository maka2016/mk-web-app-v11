import { Label } from '@workspace/ui/components/label';
import { UploadHelper } from '@workspace/ui/components/Upload';
import { showSelector } from '../../../showSelector';
import { LottieConfig } from '../../types';

interface LottieSettingProps {
  onChangeBg: (lottieBgConfig?: LottieConfig) => void;
  onChangeFg: (lottieFgConfig?: LottieConfig) => void;
  lottieBgConfig?: LottieConfig;
  lottieFgConfig?: LottieConfig;
}

const testUrl =
  'https://res.maka.im/cdn/jiantie/works-resources/605196910/98248987742061_33ba49.png?x-oss-process=image%2Fresize%2Cm_lfit%2Cw_240%2Cimage%2Fformat%2Cwebp';

export default function LottieSetting(props: LottieSettingProps) {
  const { onChangeBg, onChangeFg, lottieBgConfig, lottieFgConfig } = props;

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs text-gray-600'>Lottie背景</Label>
        <UploadHelper
          image={lottieBgConfig ? testUrl : undefined}
          onRemove={() => {
            onChangeBg(undefined);
          }}
          onUpload={() => {
            showSelector({
              onSelected: (params: any) => {
                const { url } = params;

                onChangeBg({
                  url,
                  loop: true,
                  autoplay: true,
                  speed: 1,
                });
              },
              type: 'picture',
              // preUpload: false
            } as any);
          }}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs text-gray-600'>Lottie前景</Label>
        <UploadHelper
          image={lottieFgConfig ? testUrl : undefined}
          onRemove={() => {
            onChangeFg(undefined);
          }}
          onUpload={() => {
            showSelector({
              onSelected: (params: any) => {
                const { url } = params;

                onChangeFg({
                  url,
                  loop: true,
                  autoplay: true,
                  speed: 1,
                });
              },
              type: 'picture',
              // preUpload: false
            } as any);
          }}
        />
      </div>
    </div>
  );
}
