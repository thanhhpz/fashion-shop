// backend/src/modules/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new BadRequestException('Không có file nào được upload');
    }

    // Kiểm tra loại file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP, AVIF)');
    }

    // Kiểm tra kích thước (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File ảnh không được vượt quá 5MB');
    }

    // Tạo tên file mới
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    const filePath = path.join(uploadDir, fileName);

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Lưu file
    fs.writeFileSync(filePath, file.buffer);

    // Trả về URL
    return `/uploads/products/${fileName}`;
  }
}