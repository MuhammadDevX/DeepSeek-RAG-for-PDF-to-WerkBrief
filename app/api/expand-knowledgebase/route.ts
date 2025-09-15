import { NextRequest, NextResponse } from 'next/server';
import { processExcelDataForPinecone } from '@/lib/excel-parser';
import { uploadToPinecone } from '@/lib/pinecone-uploader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { excelData } = body;

    if (!excelData) {
      return NextResponse.json(
        { error: 'No Excel data provided' },
        { status: 400 }
      );
    }

    // Validate that we have the required structure
    if (!excelData.rows || !excelData.columns || !Array.isArray(excelData.rows)) {
      return NextResponse.json(
        { error: 'Invalid Excel data structure' },
        { status: 400 }
      );
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
    console.error('Error processing Excel data:', error);
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
