const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * LỚP QUẢN LÝ LƯU TRỮ DỮ LIỆU BỀN VỮNG (PERSISTENT STORE)
 * 
 * Tại sao không lưu file thẳng vào thư mục source code (`__dirname`)?
 * 1. Khi đóng gói thành file cài đặt (.exe), thư mục app sẽ bị nén vào file asar (chỉ đọc, không ghi được).
 * 2. `app.getPath('userData')` trỏ tới thư mục chuẩn của Hệ điều hành:
 *    - Windows: C:\Users\<TênUser>\AppData\Roaming\<TênApp>
 *    - macOS: ~/Library/Application Support/<TênApp>
 *    - Linux: ~/.config/<TênApp>
 */
class Store {
  constructor(options = {}) {
    // 1. Lấy đường dẫn thư mục lưu trữ của ứng dụng
    const userDataPath = app.getPath('userData');
    this.path = path.join(userDataPath, `${options.configName || 'user-preferences'}.json`);
    
    // 2. Cấu hình mặc định nếu file chưa từng tồn tại
    this.defaults = options.defaults || {};

    // 3. Đọc dữ liệu từ ổ cứng hoặc tạo file mới với giá trị mặc định
    this.data = this.parseDataFile(this.path, this.defaults);
  }

  /**
   * Đọc và parse dữ liệu từ file JSON
   */
  parseDataFile(filePath, defaults) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return { ...defaults, ...JSON.parse(fileContent) };
      }
    } catch (error) {
      console.error(`\x1b[31m[Store Error]\x1b[0m Không thể đọc file config, sử dụng cấu hình mặc định:`, error.message);
    }
    return defaults;
  }

  /**
   * Lấy giá trị của một key (hoặc lấy toàn bộ nếu không truyền key)
   */
  get(key) {
    if (!key) return this.data;
    return this.data[key];
  }

  /**
   * Cập nhật một hoặc nhiều giá trị và ghi ngay xuống đĩa cứng
   */
  set(keyOrObject, val) {
    if (typeof keyOrObject === 'object') {
      this.data = { ...this.data, ...keyOrObject };
    } else {
      this.data[keyOrObject] = val;
    }

    try {
      // Ghi đồng bộ xuống file JSON định dạng thụt lề 2 dấu cách đẹp mắt
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`\x1b[31m[Store Error]\x1b[0m Ghi file config thất bại:`, error.message);
    }
  }

  /**
   * Lấy đường dẫn thực tế của file config trên máy tính
   */
  getFilePath() {
    return this.path;
  }
}

module.exports = Store;
