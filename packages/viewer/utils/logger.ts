// import Loggerv7 from "@mk/loggerv7";
// import {
//   getPageId,
//   getPermissionData,
//   getWorksDetailStatic,
//   WorksDetailEntity,
// } from "@mk/services";
// import { getCookie, setCookie } from "./helper";
// import { DebounceClass, EventEmitter, random } from "@mk/utils";
// import { getViewerSDK } from "./viewerSDK";

// const debounce = new DebounceClass();
// const cookiesKey = "lw_said";

// interface ObjectInfo {
//   object_type: string;
//   object_id?: string;
//   object_inst_id?: string;
//   object_order?: string;
//   parent_type?: string;
//   parent_id?: string;
//   parent_inst_id?: string;
//   event_type?: string;
// }

// /** 用于记录容器是否加载完成 */
// const ContainerMountCache: any = {};
// const setContainerMountCache = (key?: string) => {
//   if (!key) return;
//   ContainerMountCache[key] = true;
// };
// const isContainerMount = (key?: string) => !!key && !!ContainerMountCache[key];

// const pageInstId = `viewer_page_${random(25).toUpperCase()}`;

// export const getDistinctId = () => {
//   let did = getCookie(cookiesKey);
//   if (!did) {
//     did = "viewer_" + random(16);
//     setCookie(cookiesKey, did, 365);
//   }
//   return did;
// };

// class ViewerLogger {
//   _logger!: Loggerv7;
//   private ready = false;
//   worksDetail!: WorksDetailEntity;
//   init = (project?: string) => {
//     // 环境判断
//     // 拼装sender,环境配置
//     const currEnv = getPermissionData().env;

//     this.worksDetail = getWorksDetailStatic();

//     this._logger = new Loggerv7({
//       project: project || "lw_link_view",
//       version: "0.1.0",
//       env: currEnv === "prod" || currEnv === "staging" ? "prod" : "test",
//       baseInfo: this.getBaseInfo,
//     });
//     window.addEventListener("click", this.handleElemClickDebounce, false);

//     EventEmitter.on("TrackerMount", this.handleMkTrackerMount);
//   };

//   private handleMkTrackerMount = (trackInfo: ObjectInfo) => {
//     if (!isContainerMount(trackInfo.object_inst_id)) {
//       this.track_show(trackInfo);
//       setContainerMountCache(trackInfo.object_inst_id);
//     }
//   };

//   changeProject = (project: string) => {
//     if (!this._logger) {
//       this.init(project);
//       this.ready = true;
//     }
//     this._logger.changeProject(project);
//   };

//   handleElemClickDebounce = (e: MouseEvent) => {
//     debounce.exec(() => this.handleElemClick(e), 100);
//   };

//   handleElemClick = (e: MouseEvent) => {
//     const target = e.target as HTMLDivElement;
//     // 当前点击元素往上检查 3 层
//     const targets = [
//       target,
//       target.parentElement,
//       target.parentElement?.parentElement,
//     ].filter((i) => !!i) as HTMLElement[];
//     const trackTarget = targets.find((item) => item.dataset.tracker === "true");

//     if (trackTarget) {
//       const { dataset } = trackTarget;
//       try {
//         const commitData = JSON.parse(dataset.behavior || "");
//         // const prefix = /data-behavior-/;
//         // for (let index = 0; index < attributes.length; index++) {
//         //   const attr = attributes[index];
//         //   if (prefix.test(attr.name)) {
//         //     commitData[attr.name.replace(prefix, "")] = attr.value;
//         //   }
//         // }
//         if (Object.keys(commitData).length > 0) {
//           this.track_click(commitData as ObjectInfo);
//         }
//       } catch (err) {
//         console.log("err", err);
//       }
//     }
//   };

//   getBaseInfo = () => {
//     const distinct_id = getDistinctId();
//     // 获取业务基础信息
//     return {
//       /** ------ */
//       /** 报表必须 */
//       uid: String(getViewerSDK().workInfo.getUID()),
//       page_type: this.worksDetail.type,
//       page_id: getPageId(),
//       ref_page_id: this.worksDetail.specIdNew,
//       ref_page_type: (this.worksDetail as any).create_device,
//       /** 报表必须 */
//       /** ------ */
//       /**
//        * 跟踪用户一次所有操作，由上一级页面来源获取
//        * 数据来源可能是 app、小程序、wap store
//        */
//       distinct_id: distinct_id,
//       device_id: "",
//       event_id: random(25).toUpperCase(),
//       is_login: "",
//       ab_test: "",
//       // TODO: 使用 app 传入的值
//       page_inst_id: pageInstId,

//       /** sls 专用 */
//       works_id: getPageId(),
//       works_type: this.worksDetail.type,
//       work_specs: this.worksDetail.specIdNew,

//       template_id: this.worksDetail.template_id,
//     } as any;
//   };

//   track_pageview = (extra = {}) => {
//     if (!this.ready) {
//       this.init();
//       this.ready = true;
//     }
//     const { location, parent } = window;
//     const referrer =
//       location !== parent.location ? document.referrer : document.location.href;
//     const data = Object.assign(
//       {
//         event_type: "page_view",
//         title: document.title,
//         url: document.location.href,
//         referrer,
//         /** 页面来源于 */
//         ref_page_type: "",
//         ref_page_id: "",
//         ref_page_inst_id: "",
//         ref_object_type: "",
//         ref_object_id: "",
//         ref_object_inst_id: "",
//         ref_event_id: "",
//         source_type: "",
//         source_id: "",
//       },
//       extra
//     ) as any;
//     this.track(data);
//   };

//   /**
//    * 统一处理和补全打点信息
//    */
//   track = (data: ObjectInfo, imd = false) => {
//     if (!this.ready) {
//       this.init();
//       this.ready = true;
//     }
//     if (!data.object_id) {
//       /** 如果没有定义 object_id，则采用 page id */
//       data.object_id = this.getBaseInfo().page_id;
//     }
//     if (!data.parent_id) {
//       /** 如果没有定义 object_id，则采用 page id */
//       data.parent_id = this.getBaseInfo().page_id;
//     }
//     if (!data.parent_type) {
//       data.parent_type = this.getBaseInfo().page_type;
//     }
//     if (!data.parent_inst_id) {
//       data.parent_inst_id = this.getBaseInfo().page_inst_id;
//     }
//     this._logger.track(data, imd);
//   };

//   /**
//    * 通过 Container 的 behavior 定义
//    */
//   track_click = (eleData: ObjectInfo) => {
//     const data = Object.assign(eleData, {
//       event_type: "click",
//     });
//     // 上报
//     this.track(data, true);
//   };

//   track_show = (eleData: ObjectInfo) => {
//     const data = Object.assign(eleData, {
//       event_type: "show",
//     });
//     // 上报
//     this.track(data);
//   };

//   track_success = (eleData: ObjectInfo) => {
//     const data = Object.assign(eleData, {
//       event_type: "success",
//     });
//     // 上报
//     this.track(data);
//   };
// }

// export const viewerLogger = new ViewerLogger();
