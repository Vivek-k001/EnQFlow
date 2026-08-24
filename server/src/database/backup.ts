import { db } from './index';
import path from 'path';
import fs from 'fs';

export const createBackup = async () => {
  return new Promise<string>((resolve, reject) => {
    try {
      const backupDir = path.join(__dirname, '../../../../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup_${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFile);

      db.backup(backupPath)
        .then(() => {
          resolve(backupFile);
        })
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
};
