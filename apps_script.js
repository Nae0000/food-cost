// =========================================================================
// FoodCost - Google Apps Script Backend (Multi-Store Support)
// =========================================================================

function doGet(e) {
    return handleRequest(e, 'GET');
}

function doPost(e) {
    return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
    // สร้าง CORS Headers ให้เว็บเรา (GitHub Pages) หรือเว็บไหนๆ ยิง API มาได้
    var headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        // อ่านพารามิเตอร์ที่ส่งมา
        var storeCode = e.parameter.storeCode;
        var action = e.parameter.action;

        if (!storeCode) {
            return buildResponse({ success: false, error: 'Missing storeCode' }, headers);
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();

        // ค้นหา Sheet ของร้านค้านั้นๆ (ถ้าไม่มี ให้สร้างใหม่)
        var sheet = ss.getSheetByName(storeCode);
        if (!sheet) {
            sheet = ss.insertSheet(storeCode);
            // ตั้งค่าหัวตารางเริ่มต้นให้ Sheet ใหม่
            sheet.getRange(1, 1, 1, 2).setValues([['lastUpdated', 'jsonData']]);
        }

        // กรณี GET (ดึงข้อมูล)
        if (action === 'getData') {
            var data = sheet.getRange("B2").getValue(); // เก็บ JSON ไว้ที่ช่อง B2
            if (!data) data = "{}";
            return buildResponse({ success: true, data: JSON.parse(data) }, headers);
        }

        // กรณี POST (บันทึกข้อมูล)
        if (action === 'saveData') {
            var postData = JSON.parse(e.postData.contents);
            var jsonDataString = JSON.stringify(postData.data);

            // บันทึกเวลาอัปเดตล่าสุดที่ A2 และ JSON Data ที่ B2
            sheet.getRange("A2").setValue(new Date().toISOString());
            sheet.getRange("B2").setValue(jsonDataString);

            return buildResponse({ success: true, message: 'Data saved successfully' }, headers);
        }

        return buildResponse({ success: false, error: 'Unknown action' }, headers);

    } catch (error) {
        return buildResponse({ success: false, error: error.toString() }, headers);
    }
}

// Function สำหรับสร้าง Http Response พร้อม Headers (CORS)
function buildResponse(content, headers) {
    var output = ContentService.createTextOutput(JSON.stringify(content));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}
