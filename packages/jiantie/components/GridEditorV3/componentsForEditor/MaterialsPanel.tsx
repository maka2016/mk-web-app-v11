import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { useState } from 'react';
import EnvelopeResourceManagement from '../componentForContentLib/EnvelopeResourceManager/EnvelopeResourceManagement';
import MaterialColors from '../componentForContentLib/ThemeLayoutLibraryV3/MaterialColors';
import MaterialPic from '../componentForContentLib/ThemeLayoutLibraryV3/MaterialPic';
import MaterialText from '../componentForContentLib/ThemeLayoutLibraryV3/MaterialText';

export type MaterialSubTab =
  | 'envelope'
  | 'materials_pic'
  | 'materials_text'
  | 'materials_color';

export default function MaterialsPanel() {
  const [materialSubTab, setMaterialSubTab] = useState<MaterialSubTab>(
    'materials_pic'
  );

  return (
    <Tabs
      value={materialSubTab}
      onValueChange={v => setMaterialSubTab(v as MaterialSubTab)}
      className='h-full overflow-hidden'
    >
      <TabsList className='flex h-auto justify-start gap-2 py-1 m-1 items-stretch self-stretch'>
        <TabsTrigger value='materials_pic'>图库</TabsTrigger>
        <TabsTrigger value='materials_text'>文案</TabsTrigger>
        <TabsTrigger value='materials_color'>色板</TabsTrigger>
        <TabsTrigger value='envelope'>信封</TabsTrigger>
      </TabsList>
      <TabsContent value='envelope' className='flex-1 overflow-hidden'>
        <EnvelopeResourceManagement />
      </TabsContent>
      <TabsContent value='materials_pic' className='flex-1 overflow-hidden'>
        <MaterialPic />
      </TabsContent>
      <TabsContent value='materials_text' className='flex-1 overflow-hidden'>
        <MaterialText />
      </TabsContent>
      <TabsContent value='materials_color' className='flex-1 overflow-hidden'>
        <MaterialColors />
      </TabsContent>
    </Tabs>
  );
}
