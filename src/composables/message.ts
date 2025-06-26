import { h, render } from 'vue'
import Message from '@/components/Message.vue'

const WMessage = (msg: string, mtp: MsgType, timeOut=3000) => {
  if(mtp=='error'){
    console.log(`error from WMessage:${msg}`)
  }
  const messageVnode = h(Message,{message: msg, mtype: mtp})
  const node = document.createElement('div')
  document.body.appendChild(node)
  render(messageVnode, node)
  const destroy = () => {
    render(null, node)
    document.body.removeChild(node)
  }
  if(timeOut > 0){
    setTimeout(() => {
      destroy()
    }, timeOut)
  }
  return {destroy}
}

export default WMessage