// /**
//  * document.querySelector 的简写
//  *
//  * @param {string} selector
//  * @return {*}
//  */
//  export const q = (selector: string) => {
//     return document.querySelector(selector)
// }

// /**
//  * 从canvas 元素中取得dom document.querySelector 的简写
//  *
//  * @param {string} selector
//  * @return {*}
//  */
// export const cq = (selector: string) => {
//     if (selector.includes(pageConfig.canvasId)) {
//         return document.querySelector(selector)
//     }
//     return document.querySelector(`#id-canvas ${selector}`)
// }

// /**
//  * 从canvas 元素中取得dom document.querySelectorAll 的简写
//  *
//  * @param {string} selector
//  * @return {*}
//  */
// export const cqs = (selector: string) => {
//     if (selector.includes(pageConfig.canvasId)) {
//         return [...document.querySelectorAll(selector)]
//     }
//     return [...document.querySelectorAll(`#id-canvas ${selector}`)]
// }

// /**
//  * document.querySelectorAll 的简写
//  *
//  * @param {string} selector
//  * @return {*}
//  */
// export const qs = (selector: string) => {
//     return [...document.querySelectorAll(selector)]
// }
