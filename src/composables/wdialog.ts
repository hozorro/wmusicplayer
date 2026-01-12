import { createVNode, render, type Component } from "vue";
import WDialog from "@/components/WDialog.vue";

let dialogZIndex = 1000;

export const openDialog = async <T>(content: Component, options: any = {}): Promise<T | null> => {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.zIndex = (dialogZIndex++).toString();
    container.style.width = '100%';
    document.body.appendChild(container);

    const vnode = createVNode(WDialog, { 
      ...options, 
      content,
      onClose: () => {
        render(null, container);
        document.body.removeChild(container);
        dialogZIndex--;
        resolve(null);
      },
      onConfirm: (data: T) => {
        render(null, container);
        document.body.removeChild(container);
        dialogZIndex--;
        resolve(data);
      },
      onSelect: (data: T) => {
        render(null, container);
        document.body.removeChild(container);
        dialogZIndex--;
        resolve(data);
      }
    });
    render(vnode, container);
  });
}