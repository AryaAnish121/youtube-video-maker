import fs from 'fs';

console.log(
  "IMPORTANT: Make sure that the facts in './util/facts.txt' are updated"
);
const rdata = fs.readFileSync('./util/facts.txt', 'utf-8');
const data = rdata.split('\n');
const nData = [];

data.forEach((s) => {
  let text = '';
  let object = '';
  const f = s.split('-');
  f.forEach((x, i) => {
    if (i === f.length - 1) object = x.replaceAll('\r', '').substring(1);
    else if (i === f.length - 2) text += `${x.substring(0, x.length - 1)}`;
    else text += `${x} `;
  });
  nData.push({ text, object });
});

console.log(nData);
fs.writeFileSync('./util/facts.json', JSON.stringify(nData), 'utf-8');
