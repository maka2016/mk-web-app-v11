// export const txMapKey = "4PLBZ-F74CW-YCFRV-3ELU6-LVRL5-WUBPL"
// export const txMapKey = "52HBZ-FHLKX-O3543-7XLAA-U5HP3-B3BWN";
const keyArr = [
  'NEFBZ-SHRC3-FW63X-R2V5S-OWEEZ-ZHBPD',
  'Z7YBZ-OF5H3-NUI3P-RORLV-IEL7Q-R6FIP',
  'UTDBZ-H46K4-QSDU7-FKABM-7S4SE-U6BCM',
  'CR2BZ-SX7K7-YMVXF-PE37D-7BNHO-RXBN5',
  'QRXBZ-TBX3J-OV3FD-XJBUT-EZUW5-WCF2V',
];
export const txMapKey = keyArr[Math.floor(Math.random() * keyArr.length)];

export const defaultFormData = {
  zoom: 12,
  latLng: {
    lat: 23.09909,
    lng: 113.326,
  },
  address: '广东省广州市海珠区TIT创意园创意东路5号',
};
