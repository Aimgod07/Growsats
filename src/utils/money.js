export function toMinorUnits(value){
 const text=String(value).trim();
 if(!/^\d{1,8}(\.\d{1,2})?$/.test(text))return null;
 const [whole,part='']=text.split('.');const n=Number(whole)*100+Number(part.padEnd(2,'0'));
 return Number.isSafeInteger(n)&&n>0?n:null;
}
