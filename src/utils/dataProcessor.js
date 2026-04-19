import Papa from 'papaparse';
import { parse, format, isValid } from 'date-fns';

const SPREADSHEET_ID = '1paLdFUOdWbrqsPVbtYBVS7fh1lJp_N0BfhGLBvyXozc';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

const parseDate = (str) => {
  if (!str) return null;
  let d = parse(str, 'dd/MM/yyyy', new Date());
  if (!isValid(d)) d = parse(str, 'd/M/yyyy', new Date());
  if (!isValid(d)) return null;
  const yr = d.getFullYear();
  if (yr < 100) d.setFullYear(yr + 2000);
  else if (yr > 2100 && yr < 9999) d.setFullYear(parseInt(String(yr).split('').reverse().join('').slice(0,4)));
  const corrected = d.getFullYear();
  if (corrected < 2020 || corrected > 2030) return null;
  return d;
};

export const fetchBPData = async () => {
  const response = await fetch(CSV_URL);
  const csvContent = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.slice(2);
        const processed = rows
          .map((row, i) => {
            const rawDate = row[0]?.trim();
            const time = row[1]?.trim() || 'Unknown';
            const parsedDate = parseDate(rawDate);
            if (!parsedDate || !row[11]) return null;

            const s = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };

            const avgSys = s(row[11]);
            const avgDia = s(row[12]);
            const avgHr = s(row[13]);

            if (!avgSys) return null;

            return {
              id: i,
              rawDate,
              date: parsedDate,
              dateLabel: format(parsedDate, 'dd MMM'),
              dateFull: format(parsedDate, 'dd MMM yyyy'),
              time,
              sys: avgSys,
              dia: avgDia,
              hr: avgHr,
              pp: avgSys - avgDia,
              status: getBPStatus(avgSys, avgDia),
              readings: [
                s(row[2]) ? { sys: s(row[2]), dia: s(row[3]), hr: s(row[4]) } : null,
                s(row[5]) ? { sys: s(row[5]), dia: s(row[6]), hr: s(row[7]) } : null,
                s(row[8]) ? { sys: s(row[8]), dia: s(row[9]), hr: s(row[10]) } : null,
              ].filter(Boolean),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.date - b.date);

        resolve(processed);
      },
      error: reject,
    });
  });
};

export const getBPStatus = (sys, dia) => {
  if (!sys || !dia) return { label: 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.2)' };
  if (sys > 180 || dia > 120) return { label: 'Crisis', color: '#dc2626', bg: 'rgba(220,38,38,0.2)' };
  if (sys >= 140 || dia >= 90) return { label: 'Stage 2 High', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' };
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { label: 'Stage 1 High', color: '#f97316', bg: 'rgba(249,115,22,0.2)' };
  if (sys >= 120 && sys <= 129 && dia < 80) return { label: 'Elevated', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' };
  return { label: 'Normal', color: '#10b981', bg: 'rgba(16,185,129,0.2)' };
};

export const getSummary = (data) => {
  if (!data?.length) return null;

  const latest = data[data.length - 1];
  const total = data.length;

  const avg = (arr) => Math.round(arr.reduce((s, n) => s + n, 0) / arr.length);

  const avgSys = avg(data.map(d => d.sys));
  const avgDia = avg(data.map(d => d.dia));
  const avgHr = avg(data.map(d => d.hr));

  const maxSys = Math.max(...data.map(d => d.sys));
  const minSys = Math.min(...data.map(d => d.sys));

  const byTime = (label) => {
    const f = data.filter(d => d.time === label);
    return f.length ? { sys: avg(f.map(d => d.sys)), dia: avg(f.map(d => d.dia)), hr: avg(f.map(d => d.hr)), count: f.length } : null;
  };

  const statusCounts = data.reduce((acc, d) => {
    acc[d.status.label] = (acc[d.status.label] || 0) + 1;
    return acc;
  }, {});

  const last14 = data.slice(-14);
  const prev14 = data.slice(-28, -14);
  const trendSys = prev14.length ? avg(last14.map(d => d.sys)) - avg(prev14.map(d => d.sys)) : 0;

  return {
    latest,
    total,
    avgSys,
    avgDia,
    avgHr,
    maxSys,
    minSys,
    morning: byTime('Morning'),
    midDay: byTime('Mid-Day'),
    evening: byTime('Evening'),
    statusCounts,
    trendSys: Math.round(trendSys),
  };
};