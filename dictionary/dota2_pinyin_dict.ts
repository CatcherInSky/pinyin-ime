import type { DictEntry, PinyinDict } from "../src/types/dist";
import { dict as GoogleDist } from "./google_pinyin_dict";
/**
 * 合并同一拼音 key 下的多条 {@link DictEntry} 列表；同一 `w` 保留全局最大 `f`。
 *
 * @param groups - 若干条目列表（可含 `undefined`）
 * @returns 按 `f` 降序排列的合并列表
 */
function mergeDictEntryGroups(
  ...groups: (DictEntry[] | undefined)[]
): DictEntry[] {
  const byWord = new Map<string, number>();
  for (const g of groups) {
    if (!g) continue;
    for (const { w, f } of g) {
      const prev = byWord.get(w);
      if (prev === undefined || f > prev) {
        byWord.set(w, f);
      }
    }
  }
  return Array.from(byWord.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w, f]) => ({ w, f }));
}

/**
 * 合并多个 {@link PinyinDict}：对每个 key 合并其 value 数组；重复词条取较大 `f`。
 *
 * @param dicts - 至少一个词典
 * @returns 新的顶层对象（不修改入参）
 */
export function mergePinyinDicts(...dicts: PinyinDict[]): PinyinDict {
  if (dicts.length === 0) {
    return {};
  }
  const keys = new Set<string>();
  for (const d of dicts) {
    for (const k of Object.keys(d)) {
      keys.add(k);
    }
  }
  const out: PinyinDict = {};
  for (const key of keys) {
    const merged = mergeDictEntryGroups(...dicts.map((d) => d[key]));
    if (merged.length > 0) {
      out[key] = merged;
    }
  }
  return out;
}
const dota2Dist: PinyinDict = {
  // 英雄
  arzsj: [{ w: "矮人直升机", f: 980000 }],
  huonv: [{ w: "火女", f: 990000 }],
  hn: [{ w: "火女", f: 990000 }],
  lina: [{ w: "莉娜", f: 900000 }],
  ln: [{ w: "莉娜", f: 900000 }],
  bingnv: [{ w: "冰女", f: 980000 }],
  bn: [{ w: "冰女", f: 980000 }],
  jinglinglong: [{ w: "精灵龙", f: 960000 }],
  jll: [{ w: "精灵龙", f: 960000 }],
  xiaoxiao: [{ w: "小小", f: 970000 }],
  xx: [{ w: "小小", f: 970000 }],
  youlingcike: [{ w: "幽灵刺客", f: 990000 }],
  ylc: [{ w: "幽灵刺客", f: 990000 }],
  shengtangcike: [{ w: "圣堂刺客", f: 980000 }],
  st: [{ w: "圣堂刺客", f: 980000 }],
  emowushi: [{ w: "恶魔巫师", f: 960000 }],
  emws: [{ w: "恶魔巫师", f: 960000 }],
  laien: [{ w: "莱恩", f: 940000 }],
  le: [{ w: "莱恩", f: 940000 }],
  yingmo: [{ w: "影魔", f: 990000 }],
  ym: [{ w: "影魔", f: 990000 }],
  shengjian: [{ w: "圣剑", f: 880000 }],
  sj: [{ w: "圣剑", f: 880000 }],
  xukongjiamian: [{ w: "虚空假面", f: 980000 }],
  xkjm: [{ w: "虚空假面", f: 980000 }],
  jiamian: [{ w: "假面", f: 950000 }],
  jm: [{ w: "假面", f: 950000 }],
  huijinzhiling: [{ w: "灰烬之灵", f: 950000 }],
  hjzl: [{ w: "灰烬之灵", f: 950000 }],
  huomao: [{ w: "火猫", f: 980000 }],
  hm: [{ w: "火猫", f: 980000 }],
  fengbaozhiling: [{ w: "风暴之灵", f: 960000 }],
  fbzl: [{ w: "风暴之灵", f: 960000 }],
  lanmao: [{ w: "蓝猫", f: 990000 }],
  lm: [{ w: "蓝猫", f: 990000 }],
  dadizhiling: [{ w: "大地之灵", f: 940000 }],
  ddzl: [{ w: "大地之灵", f: 940000 }],
  tudou: [{ w: "土猫", f: 950000 }],
  tm: [{ w: "土猫", f: 950000 }],
  fengxingzhe: [{ w: "风行者", f: 900000 }],
  fxz: [{ w: "风行者", f: 900000 }],
  fengxing: [{ w: "风行", f: 930000 }],
  fx: [{ w: "风行", f: 930000 }],
  sjsn: [{ w: "水晶室女", f: 930000 }],
  binghun: [{ w: "冰魂", f: 900000 }],
  hdfl: [{ w: "寒冬飞龙", f: 900000 }],
  niutou: [{ w: "牛头", f: 960000 }],
  nt: [{ w: "牛头", f: 960000 }],
  xiaoniu: [{ w: "小牛", f: 960000 }],
  xn: [{ w: "小牛", f: 960000 }],
  tufu: [{ w: "屠夫", f: 980000 }],
  tf: [{ w: "屠夫", f: 980000 }],
  yuren: [{ w: "鱼人", f: 910000 }],
  yrsw: [{ w: "鱼人守卫", f: 910000 }],
  silada: [{ w: "斯拉达", f: 930000 }],
  sld: [{ w: "斯拉达", f: 930000 }],
  shangjinlieren: [{ w: "赏金猎人", f: 960000 }],
  sjlr: [{ w: "赏金猎人", f: 960000 }],
  xiaoqiang: [{ w: "小强", f: 950000 }],
  syck: [{ w: "司夜刺客", f: 950000 }],
  gangbei: [{ w: "钢背兽", f: 950000 }],
  gbs: [{ w: "钢背兽", f: 950000 }],
  qitiandasheng: [{ w: "齐天大圣", f: 940000 }],
  qtds: [{ w: "齐天大圣", f: 940000 }],
  jiansheng: [{ w: "剑圣", f: 980000 }],
  js: [{ w: "剑圣", f: 980000 }],
  hundunqishi: [{ w: "混沌骑士", f: 920000 }],
  hdqs: [{ w: "混沌骑士", f: 920000 }],
  huanyingchangmaoshou: [{ w: "幻影长矛手", f: 920000 }],
  hycms: [{ w: "幻影长矛手", f: 920000 }],
  minjieyalong: [{ w: "冥界亚龙", f: 900000 }],
  mjyl: [{ w: "冥界亚龙", f: 900000 }],
  difashi: [{ w: "敌法师", f: 960000 }],
  dfs: [{ w: "敌法师", f: 960000 }],
  difa: [{ w: "敌法", f: 980000 }],
  df: [{ w: "敌法", f: 980000 }],

  // 物品
  heihuangzhang: [{ w: "黑皇杖", f: 995000 }],
  hhz: [{ w: "黑皇杖", f: 995000 }],
  kuangzhanfu: [{ w: "狂战斧", f: 980000 }],
  kzf: [{ w: "狂战斧", f: 980000 }],
  tiaodao: [{ w: "闪烁匕首", f: 990000 }],
  ssbs: [{ w: "闪烁匕首", f: 990000 }],
  td: [{ w: "跳刀", f: 980000 }],
  yindao: [{ w: "隐刀", f: 980000 }],
  yd: [{ w: "隐刀", f: 980000 }],
  fengzhang: [{ w: "风杖", f: 980000 }],
  fz: [{ w: "风杖", f: 980000 }],
  xieeliandao: [{ w: "邪恶镰刀", f: 980000 }],
  xeld: [{ w: "邪恶镰刀", f: 980000 }],
  yangdao: [{ w: "羊刀", f: 990000 }],
  // yd: [{ w: "羊刀", f: 990000 }],
  longxin: [{ w: "龙心", f: 980000 }],
  lx: [{ w: "龙心", f: 980000 }],
  qiangxixiongjia: [{ w: "强袭胸甲", f: 970000 }],
  qxxj: [{ w: "强袭胸甲", f: 970000 }],
  xiwa: [{ w: "西瓦", f: 940000 }],
  xw: [{ w: "西瓦的守护", f: 940000 }],
  liankenfaqiu: [{ w: "林肯法球", f: 970000 }],
  lkfq: [{ w: "林肯法球", f: 970000 }],
  fashikexing: [{ w: "法师克星", f: 930000 }],
  fskx: [{ w: "法师克星", f: 930000 }],
  huiyao: [{ w: "辉耀", f: 980000 }],
  hy: [{ w: "辉耀", f: 980000 }],
  dayao: [{ w: "大药", f: 970000 }],
  dy: [{ w: "大药", f: 970000 }],
  pingzi: [{ w: "瓶子", f: 980000 }],
  moping: [{ w: "魔瓶", f: 980000 }],
  mp: [{ w: "魔瓶", f: 980000 }],
  xiangweixie: [{ w: "相位鞋", f: 960000 }],
  xwx: [{ w: "相位鞋", f: 960000 }],
  donglixie: [{ w: "动力鞋", f: 960000 }],
  dlx: [{ w: "动力鞋", f: 960000 }],
  feixie: [{ w: "飞鞋", f: 980000 }],
  fxie: [{ w: "飞鞋", f: 980000 }],
  ahlmsz: [{ w: "阿哈利姆神杖", f: 960000 }],
  mojing: [{ w: "魔晶", f: 940000 }],
  ahlmmj: [{ w: "阿哈利姆魔晶", f: 940000 }],
  ziyuan: [{ w: "紫苑", f: 960000 }],
  zy: [{ w: "紫苑", f: 960000 }],
  foujue: [{ w: "否决", f: 900000 }],
  fj: [{ w: "否决", f: 900000 }],
  anmie: [{ w: "黯灭", f: 970000 }],
  am: [{ w: "黯灭", f: 970000 }],
  dapao: [{ w: "大炮", f: 970000 }],
  dp: [{ w: "大炮", f: 970000 }],
  hudie: [{ w: "蝴蝶", f: 960000 }],
  hd: [{ w: "蝴蝶", f: 960000 }],

  // 术语与常用简称
  bubing: [{ w: "补兵", f: 995000 }],
  bb: [{ w: "补兵", f: 995000 }],
  fanbu: [{ w: "反补", f: 980000 }],
  fb: [{ w: "反补", f: 980000 }],
  duixian: [{ w: "对线", f: 995000 }],
  dx: [{ w: "对线", f: 995000 }],
  youzou: [{ w: "游走", f: 970000 }],
  yz: [{ w: "游走", f: 970000 }],
  zhuaren: [{ w: "抓人", f: 980000 }],
  zr: [{ w: "抓人", f: 980000 }],
  kaiwu: [{ w: "开雾", f: 980000 }],
  kw: [{ w: "开雾", f: 980000 }],
  roushan: [{ w: "肉山", f: 995000 }],
  rs: [{ w: "肉山", f: 995000 }],
  buxiudun: [{ w: "不朽盾", f: 980000 }],
  bxd: [{ w: "不朽盾", f: 980000 }],
  maihuo: [{ w: "买活", f: 990000 }],
  mh: [{ w: "买活", f: 990000 }],
  chaojibing: [{ w: "超级兵", f: 960000 }],
  cjb: [{ w: "超级兵", f: 960000 }],
  gaodi: [{ w: "高地", f: 990000 }],
  gd: [{ w: "高地", f: 990000 }],
  tuijin: [{ w: "推进", f: 970000 }],
  tj: [{ w: "推进", f: 970000 }],
  daixian: [{ w: "带线", f: 980000 }],
  dxian: [{ w: "带线", f: 980000 }],
  shoujia: [{ w: "守家", f: 970000 }],
  sjia: [{ w: "守家", f: 970000 }],
  kongzhi: [{ w: "控制", f: 980000 }],
  kz: [{ w: "控制", f: 980000 }],
  chenmo: [{ w: "沉默", f: 960000 }],
  cm: [{ w: "沉默", f: 960000 }],
  xuanyun: [{ w: "眩晕", f: 970000 }],
  xy: [{ w: "眩晕", f: 970000 }],
  jiansu: [{ w: "减速", f: 960000 }],
  jsu: [{ w: "减速", f: 960000 }],
  baofa: [{ w: "爆发", f: 970000 }],
  bf: [{ w: "爆发", f: 970000 }],
  xuhang: [{ w: "续航", f: 950000 }],
  xh: [{ w: "续航", f: 950000 }],
  yihaowei: [{ w: "一号位", f: 960000 }],
  yhw: [{ w: "一号位", f: 960000 }],
  erhaowei: [{ w: "二号位", f: 960000 }],
  ehw: [{ w: "二号位", f: 960000 }],
  sanhaowei: [{ w: "三号位", f: 960000 }],
  shw: [{ w: "三号位", f: 960000 }],
  sihaowei: [{ w: "四号位", f: 960000 }],
  sihw: [{ w: "四号位", f: 960000 }],
  wuhaowei: [{ w: "五号位", f: 960000 }],
  whw: [{ w: "五号位", f: 960000 }],
  dage: [{ w: "大哥", f: 980000 }],
  dg: [{ w: "大哥", f: 980000 }],
  fuzhu: [{ w: "辅助", f: 990000 }],
  fzhu: [{ w: "辅助", f: 990000 }],
  zhongdan: [{ w: "中单", f: 995000 }],
  zd: [{ w: "中单", f: 995000 }],
  liedan: [{ w: "劣单", f: 960000 }],
  ld: [{ w: "劣单", f: 960000 }],
  youshilu: [{ w: "优势路", f: 960000 }],
  ysl: [{ w: "优势路", f: 960000 }],
  lieshilu: [{ w: "劣势路", f: 960000 }],
  lsl: [{ w: "劣势路", f: 960000 }],
  shuaye: [{ w: "刷野", f: 970000 }],
  sy: [{ w: "刷野", f: 970000 }],
  yequ: [{ w: "野区", f: 960000 }],
  daye: [{ w: '打野', f: 970000 }],
};
export const dict = mergePinyinDicts(GoogleDist, dota2Dist);