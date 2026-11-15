import { defineHead } from 'void';
export const ssr = false;
export const head = defineHead(() => ({
  title: 'STACKUP | AWS SAP 学習',
  meta: [
    { name: 'description', content: 'AWS SAP合格を目指す演習・復習アプリ' },
  ],
}));
