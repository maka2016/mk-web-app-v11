import { NextResponse } from 'next/server';
import { getChats } from '../../../../../utils/feishu';

export async function GET() {
  try {
    const res = await getChats();
    if (res.code === 0) {
      const groups = res.data.items.map((item: any) => ({
        name: item.name,
        chat_id: item.chat_id,
        description: item.description,
      }));
      return NextResponse.json({ success: true, groups });
    }
    return NextResponse.json({ error: res.msg, full_response: res }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
