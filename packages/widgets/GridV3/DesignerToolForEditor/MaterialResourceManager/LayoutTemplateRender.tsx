export { default } from './LayoutTemplateRender2';

// import React, { useState, useEffect } from "react";
// import {
//   ImageIcon,
//   Loader2,
//   Settings,
//   Trash2,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";
// import cls from "classnames";
// import { cdnApi } from "@mk/services";
// import { MaterialItem } from "../ThemePackManager/services";
// import { MaterialFloor } from "./services";
// import styled from "@emotion/styled";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@workspace/ui/components/alert-dialog";
// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "@workspace/ui/components/pagination";
// import Image from "next/image";

// export const FloorRoot = styled.div`
//   position: relative;
//   display: flex;
//   gap: 4px;
//   padding: 8px 12px;
//   .arrow_left,
//   .arrow_right {
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     position: absolute;
//     top: 12px;
//     width: 24px;
//     height: 24px;
//     box-shadow: 0px 1px 4px 0px #00000033;

//     border-radius: 50%;
//     background-color: #fff;
//     color: #000;
//     cursor: pointer;
//     z-index: 10;
//   }

//   .arrow_left {
//     left: 8px;
//   }

//   .arrow_right {
//     right: 8px;
//   }

//   .scroll {
//     position: relative;
//     display: flex;
//     flex-wrap: wrap;
//     gap: 8px;
//   }
//   .floorItem {
//     height: 28px;
//     padding: 0px 8px;
//     border-radius: 6px;
//     background-color: #f5f5f5;
//     cursor: pointer;
//     white-space: nowrap;
//     font-family: PingFang SC;
//     font-weight: 400;
//     font-size: 14px;
//     line-height: 28px;
//     color: #00000099;
//     display: flex;
//     align-items: center;
//     gap: 4px;

//     &.active {
//       background-color: #1a87ff;
//       color: #fff;
//     }
//   }
//   .backButton {
//     height: 28px;
//     padding: 0px 8px;
//     border-radius: 6px;
//     background-color: #f5f5f5;
//     cursor: pointer;
//     white-space: nowrap;
//     font-family: PingFang SC;
//     font-weight: 400;
//     font-size: 14px;
//     line-height: 28px;
//     color: #00000099;
//     display: flex;
//     align-items: center;
//     gap: 4px;
//   }
// `;

// export const LayoutTemplateRoot = styled.div`
//   display: flex;
//   flex-direction: column;
//   flex: 1;
//   overflow: hidden;
//   position: relative;
//   .items_wrapper {
//     flex: 1;
//     overflow: auto;
//     .scroll_list {
//       display: grid;
//       padding: 8px 12px;
//       align-content: baseline;
//       grid-template-columns: repeat(3, 1fr);
//       gap: 8px;
//       height: fit-content;
//     }
//   }
//   .pagination_wrapper {
//     padding: 8px;
//     display: flex;
//     justify-content: center;
//     border-top: 1px solid #f0f0f0;
//   }
//   .card_item {
//     position: relative;
//     max-width: 100%;
//     min-height: 100px;
//     width: 100%;
//     overflow: hidden;
//     border-radius: 4px;
//     aspect-ratio: 1/1;
//     cursor: pointer;
//     border: 1px solid #01070d0a;
//     background-image: url("https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png");
//     background-repeat: repeat;

//     &:hover {
//       background-color: #f5f5f5;
//       .action_btns {
//         opacity: 1;
//       }
//     }
//     img {
//       width: 100%;
//       height: 100%;
//       object-fit: contain;
//       object-position: top;
//     }
//     .name {
//       position: absolute;
//       bottom: 8px;
//       left: 8px;
//       padding: 0 2px;
//       background: #01070d66;
//       color: #fff;
//       font-size: 11px;
//       font-weight: 400;
//       text-align: center;
//       height: 16px;
//       border-radius: 2.5px;
//     }
//     .action_btns {
//       opacity: 0;
//       position: absolute;
//       top: 0;
//       right: 0;
//       background-color: rgba(0, 0, 0, 0.6);
//       border-radius: 2.5px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       gap: 12px;
//       color: #fff;
//     }
//   }
//   .loading_wrapper {
//     position: absolute;
//     top: 0;
//     left: 0;
//     right: 0;
//     bottom: 0;
//     background-color: rgba(0, 0, 0, 0.3);
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     z-index: 11;
//   }
// `;

// export default function LayoutTemplateRender({
//   onItemClick,
//   onSettingMaterial,
//   onRemoveMaterial,
//   onChangeFloor,
//   onPageChange,
//   currentPage = 1,
//   pageSize = 10,
//   total = 0,
//   activeFloorId,
//   floors,
//   materials,
//   loading,
// }: {
//   onItemClick: (material: MaterialItem) => void;
//   onSettingMaterial: (material: MaterialItem) => void;
//   onRemoveMaterial: (material: MaterialItem) => void;
//   onChangeFloor: (floorId: string, floor: MaterialFloor | null) => void;
//   onPageChange?: (page: number) => void;
//   currentPage?: number;
//   pageSize?: number;
//   total?: number;
//   activeFloorId: string;
//   floors: MaterialFloor[];
//   materials: MaterialItem[];
//   loading?: boolean;
// }) {
//   const totalPages = Math.ceil(total / pageSize);

//   // 二级分类状态管理
//   const [currentParent, setCurrentParent] = useState<MaterialFloor | null>(
//     null
//   );
//   const [childFloors, setChildFloors] = useState<MaterialFloor[]>([]);
//   const [isInChildView, setIsInChildView] = useState(false);

//   // 分离父级和子级分类
//   const parentFloors = floors.filter(
//     (floor) => !floor.parents || floor.parents.length === 0
//   );

//   // 检查分类是否有子级
//   const hasChildren = (floor: MaterialFloor) => {
//     return floors.some(
//       (f: MaterialFloor) =>
//         f.parents &&
//         f.parents.some((p: MaterialFloor) => p.documentId === floor.documentId)
//     );
//   };

//   // 处理分类点击
//   const handleFloorClick = (floor: MaterialFloor) => {
//     // 检查是否有子级分类
//     const children = floors.filter(
//       (f: MaterialFloor) =>
//         f.parents &&
//         f.parents.some((p: MaterialFloor) => p.documentId === floor.documentId)
//     );

//     if (children.length > 0) {
//       // 有子级分类，进入二级视图，但不立即选择父级
//       setCurrentParent(floor);
//       setChildFloors(children);
//       setIsInChildView(true);
//     } else {
//       // 没有子级分类，直接选择该分类
//       onChangeFloor(floor.documentId, floor);
//     }
//   };

//   // 处理子级分类点击
//   const handleChildFloorClick = (floor: MaterialFloor) => {
//     onChangeFloor(floor.documentId, floor);
//   };

//   // 返回父级视图
//   const handleBackToParent = () => {
//     setIsInChildView(false);
//     setCurrentParent(null);
//     setChildFloors([]);
//     // 清除当前选中的分类
//     onChangeFloor("", null);
//   };

//   // 当activeFloorId变化时，检查是否需要更新视图状态
//   useEffect(() => {
//     // 只在父级视图中检查是否需要自动进入子级视图
//     if (!isInChildView) {
//       const isParentSelected = parentFloors.some(
//         (f: MaterialFloor) => f.documentId === activeFloorId
//       );

//       if (!isParentSelected && activeFloorId !== "") {
//         // 如果选中的不是父级分类，需要找到对应的父级并进入子级视图
//         const parent = floors.find(
//           (f: MaterialFloor) =>
//             f.material_tags &&
//             f.material_tags.some(
//               (child: MaterialFloor) => child.documentId === activeFloorId
//             )
//         );
//         if (parent) {
//           const children = floors.filter(
//             (f: MaterialFloor) =>
//               f.parents &&
//               f.parents.some(
//                 (p: MaterialFloor) => p.documentId === parent.documentId
//               )
//           );
//           setCurrentParent(parent);
//           setChildFloors(children);
//           setIsInChildView(true);
//         }
//       }
//     }
//   }, [activeFloorId, floors, isInChildView, parentFloors]);

//   return (
//     <LayoutTemplateRoot>
//       {loading && (
//         <div className="loading_wrapper text-white">
//           <Loader2 className="w-8 h-8 animate-spin mr-2" />
//           <div className="loading_text">加载中...</div>
//         </div>
//       )}
//       <FloorRoot>
//         <div className="scroll">
//           {isInChildView ? (
//             // 子级分类视图
//             <>
//               <div className="backButton" onClick={handleBackToParent}>
//                 <ChevronLeft className="w-4 h-4" />
//                 返回
//               </div>
//               <div
//                 className={cls(
//                   "floorItem",
//                   activeFloorId === currentParent?.documentId && "active"
//                 )}
//                 onClick={() =>
//                   onChangeFloor(currentParent?.documentId || "", currentParent)
//                 }
//               >
//                 {currentParent?.name}
//               </div>
//               {childFloors.map((item) => {
//                 return (
//                   <div
//                     key={item.documentId}
//                     className={cls([
//                       "floorItem",
//                       activeFloorId === item.documentId && "active",
//                     ])}
//                     onClick={() => handleChildFloorClick(item)}
//                   >
//                     {item.name}
//                   </div>
//                 );
//               })}
//             </>
//           ) : (
//             // 父级分类视图
//             <>
//               <div
//                 className={cls("floorItem", activeFloorId === "" && "active")}
//                 onClick={() => onChangeFloor("", null)}
//               >
//                 全部
//               </div>
//               {parentFloors.map((item) => {
//                 const hasChild = hasChildren(item);
//                 return (
//                   <div
//                     key={item.documentId}
//                     className={cls([
//                       "floorItem",
//                       activeFloorId === item.documentId && "active",
//                     ])}
//                     onClick={() => handleFloorClick(item)}
//                   >
//                     {item.name}
//                     {hasChild && (
//                       <ChevronRight className="w-3 h-3 opacity-60" />
//                     )}
//                   </div>
//                 );
//               })}
//             </>
//           )}
//         </div>
//       </FloorRoot>
//       <div className="items_wrapper">
//         <div className="scroll_list">
//           {materials.map((materialItem) => {
//             const imgUrl = materialItem.cover_url || materialItem.cover?.url;
//             return (
//               <div key={materialItem.documentId} className="card_item">
//                 <div
//                   onClick={(e) => {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     onItemClick(materialItem);
//                   }}
//                   className="h-full w-full overflow-hidden"
//                 >
//                   {imgUrl ? (
//                     <img
//                       width={300}
//                       height={300}
//                       src={cdnApi(imgUrl, {
//                         resizeWidth: 300,
//                         format: "webp",
//                       })}
//                       alt=""
//                     />
//                   ) : (
//                     <div className="flex items-center justify-center w-full h-full">
//                       <ImageIcon />
//                     </div>
//                   )}
//                 </div>
//                 <div className="name">{materialItem.name}</div>
//                 <div className="action_btns">
//                   <Settings
//                     className="h-7 w-7 p-1"
//                     onClick={(e) => {
//                       e.preventDefault();
//                       e.stopPropagation();
//                       onSettingMaterial(materialItem);
//                     }}
//                   />
//                   <AlertDialog>
//                     <AlertDialogTrigger asChild>
//                       <Trash2 className="h-7 w-7 p-1" />
//                     </AlertDialogTrigger>
//                     <AlertDialogContent className="w-[320px]">
//                       <AlertDialogHeader>
//                         <AlertDialogTitle>想要删除吗？</AlertDialogTitle>
//                       </AlertDialogHeader>
//                       <AlertDialogFooter>
//                         <AlertDialogCancel>取消</AlertDialogCancel>
//                         <AlertDialogAction
//                           onClick={(e) => {
//                             onRemoveMaterial(materialItem);
//                           }}
//                         >
//                           删除
//                         </AlertDialogAction>
//                       </AlertDialogFooter>
//                     </AlertDialogContent>
//                   </AlertDialog>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//       {totalPages > 1 && (
//         <div className="pagination_wrapper">
//           <Pagination>
//             <PaginationContent>
//               <PaginationItem className="sticky left-0 bg-white">
//                 <PaginationPrevious
//                   onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
//                 />
//               </PaginationItem>

//               {Array.from({ length: totalPages }, (_, index) => (
//                 <PaginationItem key={index}>
//                   <PaginationLink
//                     href="#"
//                     onClick={(e: React.MouseEvent) => {
//                       e.preventDefault();
//                       onPageChange?.(index + 1);
//                     }}
//                     isActive={currentPage === index + 1}
//                   >
//                     {index + 1}
//                   </PaginationLink>
//                 </PaginationItem>
//               ))}

//               <PaginationItem className="sticky right-0 bg-white">
//                 <PaginationNext
//                   onClick={() =>
//                     onPageChange?.(Math.min(totalPages, currentPage + 1))
//                   }
//                 />
//               </PaginationItem>
//             </PaginationContent>
//           </Pagination>
//         </div>
//       )}
//     </LayoutTemplateRoot>
//   );
// }
