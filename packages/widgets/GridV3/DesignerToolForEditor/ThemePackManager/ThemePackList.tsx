// import React, { useEffect, useRef, useState } from "react";
// import { Button } from "@workspace/ui/components/button";
// import { toast } from "react-hot-toast";
// import { ResponsiveDialog } from "@workspace/ui/components/responsive-dialog";
// import MaterialFloorManager from "../MaterialResourceManager/MaterialFloorManager";
// import LayoutTemplateRender from "../MaterialResourceManager/LayoutTemplateRender";
// import { MaterialItem } from "./services";
// import UpdateMaterialItemForm from "../MaterialResourceManager/UpdateMaterialItemForm";
// import { MaterialResourceManagerAPI } from "../MaterialResourceManager/services";
// import { useThemePackContext } from "./ThemeProvider";
// import ThemePackSelector from "./ThemePackSelector";

// interface ThemePackCategory {
//   id: number;
//   documentId: string;
//   name: string;
//   desc: string;
//   createdAt: string;
//   updatedAt: string;
// }

// interface ThemePackListProps {
//   onSelectStyle?: (style: MaterialItem) => void;
//   className?: string;
// }

// export default function ThemePackList({
//   onSelectStyle,
//   className = "",
// }: ThemePackListProps) {
//   const { selectedMaterialChannel, themePackList, selectedThemePack } =
//     useThemePackContext();
//   console.log("selectedThemePack", selectedThemePack);

//   const themePackManager = useRef(
//     new MaterialResourceManagerAPI(selectedThemePack?.documentId || "")
//   );

//   const categories = selectedMaterialChannel?.material_tags || [];
//   const [stylingItems, setStylingItems] = useState<MaterialItem[]>([]);
//   const [filteredItems, setFilteredItems] = useState<MaterialItem[]>([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [isLoading, setIsLoading] = useState(false);
//   const [itemsPerPage] = useState(12);
//   const [showCate, setShowCate] = useState(false);
//   const [showCreator, setShowCreator] = useState(false);
//   const [selectTheme, setSelectTheme] = useState<MaterialItem>();
//   const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
//   const [showThemePackSelector, setShowThemePackSelector] = useState(false);

//   useEffect(() => {
//     loadStylingItems(selectedThemePack?.documentId || "");
//     if (selectedMaterialChannel) {
//       themePackManager.current.changeScope(selectedMaterialChannel.documentId);
//     }
//   }, [selectedThemePack]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [stylingItems]);

//   useEffect(() => {
//     const total = Math.ceil(filteredItems.length / itemsPerPage);
//     setTotalPages(total);
//     if (currentPage > total && total > 0) {
//       setCurrentPage(1);
//     }
//   }, [filteredItems, currentPage, itemsPerPage]);

//   const loadStylingItems = async (categoryId: string) => {
//     setIsLoading(true);
//     try {
//       const response = await themePackManager.current.getItems(categoryId);
//       const items = response.data || [];
//       setStylingItems(items);
//       setFilteredItems(items);
//     } catch (error) {
//       console.error("Failed to load styling items:", error);
//       toast.error("加载风格列表失败");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className={`flex flex-col h-full ${className}`}>
//       {/* 风格列表区域 */}
//       <div className="flex-1 flex flex-col min-h-0 space-y-2">
//         <div className="flex items-center p-2 pt-0">
//           <Button
//             className="mr-2"
//             size="sm"
//             variant="outline"
//             onClick={() => {
//               setShowCate(true);
//             }}
//           >
//             选择主题包
//           </Button>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => {
//               setSelectTheme(undefined);
//               setShowCreator(true);
//             }}
//           >
//             新建主题包
//           </Button>
//         </div>
//         <LayoutTemplateRender
//           onItemClick={(materialItem) => {
//             onSelectStyle?.(materialItem);
//           }}
//           onSettingMaterial={(materialItem) => {
//             setSelectTheme(materialItem);
//             setShowCreator(true);
//           }}
//           onRemoveMaterial={(materialItem) => {
//             themePackManager.current.removeItem(materialItem.documentId);
//           }}
//           onChangeFloor={(id) => {
//             themePackManager.current.changeScope(id);
//           }}
//           activeFloorId={selectedThemePack?.documentId || ""}
//           floors={categories}
//           materials={stylingItems}
//           loading={isLoading}
//         />
//       </div>
//       <ResponsiveDialog
//         isOpen={showCate}
//         onOpenChange={setShowCate}
//         title="风格分类管理"
//         contentProps={{
//           className: "max-w-[600px] w-full h-[75vh]",
//         }}
//       >
//         <MaterialFloorManager materialManager={themePackManager.current} />
//       </ResponsiveDialog>
//       <ResponsiveDialog
//         isOpen={showCreator}
//         onOpenChange={setShowCreator}
//         title="风格管理"
//         contentProps={{
//           className: "max-w-[80vw] w-full",
//         }}
//       >
//         <UpdateMaterialItemForm
//           materialItem={selectTheme}
//           categories={categories}
//           onClose={() => setShowCreator(false)}
//           onSubmit={async (submitData) => {
//             if (selectTheme?.documentId) {
//               await themePackManager.current.updateItem(
//                 selectTheme.documentId,
//                 {
//                   ...submitData,
//                 }
//               );
//             } else {
//               await themePackManager.current.createItem({
//                 ...submitData,
//               });
//             }
//             loadStylingItems(selectedThemePack?.documentId || "");
//             setIsSaveDialogOpen(false);
//             setShowCreator(false);
//           }}
//         />
//       </ResponsiveDialog>

//       <ResponsiveDialog
//         isOpen={isSaveDialogOpen}
//         onOpenChange={setIsSaveDialogOpen}
//         title={selectTheme ? "编辑风格" : "新增风格"}
//       >
//         <UpdateMaterialItemForm
//           materialItem={selectTheme}
//           categories={categories}
//           onClose={() => setIsSaveDialogOpen(false)}
//           onSubmit={async (submitData) => {
//             if (selectTheme?.documentId) {
//               await themePackManager.current.updateItem(
//                 selectTheme.documentId,
//                 {
//                   ...submitData,
//                 }
//               );
//             } else {
//               await themePackManager.current.createItem({
//                 ...submitData,
//               });
//             }
//             loadStylingItems(selectedThemePack?.documentId || "");
//             setIsSaveDialogOpen(false);
//             setShowCreator(false);
//           }}
//         />
//       </ResponsiveDialog>
//       <ResponsiveDialog
//         isOpen={showThemePackSelector}
//         onOpenChange={(isOpen) => {
//           setShowThemePackSelector(isOpen);
//         }}
//         title="主题包选择"
//         className="theme_pack_selector_drawer"
//       >
//         <ThemePackSelector
//           onSelected={() => {
//             setShowThemePackSelector(false);
//           }}
//         />
//       </ResponsiveDialog>
//     </div>
//   );
// }
