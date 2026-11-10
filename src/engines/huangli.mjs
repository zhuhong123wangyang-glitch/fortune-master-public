import {assertPlainDate,assertTimezone,standardResult} from '../core/schema.mjs';
import {loadLunar} from '../core/load-lunar.mjs';
export async function calculateHuangli({date,timezone='Asia/Shanghai',sect=1}={},libOverride){
  const d=assertPlainDate(date);assertTimezone(timezone);
  const sectNumber=Number(sect);if(![1,2].includes(sectNumber))throw new Error('黄历宜忌 sect 仅支持 1 或 2');
  const lib=libOverride||await loadLunar();
  const lunar=lib.Solar.fromYmd(d.y,d.m,d.d).getLunar();
  return standardResult('huangli',{date,timezone}, {
    lunarDate:lunar.toString(),dayGanZhi:lunar.getDayInGanZhi(),
    yearGanZhi:lunar.getYearInGanZhi(),monthGanZhi:lunar.getMonthInGanZhi(),
    yi:lunar.getDayYi(sectNumber),ji:lunar.getDayJi(sectNumber),
    dayChong:lunar.getDayChongDesc(),daySha:lunar.getDaySha(),
    dayTianShen:lunar.getDayTianShen(),dayTianShenType:lunar.getDayTianShenType()
  },{
    policy:{sect:sectNumber,sectMeaning:sectNumber===1?'以节交接当天起算月':'以节交接时刻起算月'},
    evidence:[{type:'algorithm',name:'lunar-typescript',version:'1.8.6',url:'https://6tail.cn/calendar/lunar.yiji.html',note:'宜忌为第三方历史数据拟合查表，和不同黄历来源可能存在差异'}],
    warnings:['黄历宜忌是传统民俗数据，不用于决定医疗、金融、合同等重要事项。']
  });
}
