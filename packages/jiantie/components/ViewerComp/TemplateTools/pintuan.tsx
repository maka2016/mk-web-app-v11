import MkPinTuan from '@mk/widgets/MkPinTuan/comp';
import { IWorksData } from '@mk/works-store/types';

const TemplatePinTuan = () => {
  return (
    <MkPinTuan
      id=''
      pageInfo={{
        id: '',
        opacity: 1,
        background: {},
        layers: [],
        width: 0,
        height: 0,
        pageIndex: 0,
      }}
      isActivePage={true}
      isShowPage={true}
      lifecycle={
        {
          didLoaded: () => {},
          didMount: () => {},
        } as any
      }
      // body={}
      canvaInfo={{
        scaleRate: 1,
        canvaH: 0,
        canvaW: 0,
        scaleZommRate: 1,
      }}
      controledValues={{
        formRefId: '',
        collectFields: ['age', 'name', 'phone', 'remarks'],
        type: 'baoming',
        isTemplate: true,
      }}
      widgetState={{}}
      containerInfo={{
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotate: 0,
      }}
      getWorksData={function (): IWorksData {
        throw new Error('Function not implemented.');
      }}
    ></MkPinTuan>
  );
};

export default TemplatePinTuan;
