import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, validateExcelColumns, processExcelDataForPinecone } from '@/lib/excel-parser';
import { uploadToPinecone } from '@/lib/pinecone-uploader';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type) &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Parse Excel file
    const excelData = await parseExcelFile(file);

    // Validate columns
    const validation = validateExcelColumns(excelData.columns);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        validation,
        error: 'Invalid Excel format'
      }, { status: 400 });
    }

    // Process data for Pinecone
    const pineconeDocuments = processExcelDataForPinecone(excelData);

    // Upload to Pinecone
    const uploadResult = await uploadToPinecone(pineconeDocuments);

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Failed to upload to Pinecone'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: uploadResult.message,
      uploadedCount: uploadResult.uploadedCount,
      totalRows: excelData.rows.length,
      columns: excelData.columns
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Excel Knowledge Base Upload API',
    requiredColumns: [
      'Item Name',
      'Goederen Omschrijving',
      'Goederen Code (HS Code)'
    ]
  });
}
