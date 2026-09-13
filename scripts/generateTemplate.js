import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Define the template columns and sample rows
const data = [
  {
    'Student Name': 'Aarav Sharma',
    'Hall Ticket Number': '21B91A0501',
    'Email Address': 'aarav.sharma@example.com',
    'Phone Number': '9876543210',
    'College Name': 'Sreenidhi Institute of Science and Technology',
    'Course / Branch': 'Full Stack Web Development',
  },
  {
    'Student Name': 'Ananya Reddy',
    'Hall Ticket Number': '21B91A0502',
    'Email Address': 'ananya.reddy@example.com',
    'Phone Number': '9876543211',
    'College Name': 'Sreenidhi Institute of Science and Technology',
    'Course / Branch': 'Full Stack Web Development',
  },
  {
    'Student Name': 'Rohan Varma',
    'Hall Ticket Number': '21B91A0503',
    'Email Address': 'rohan.varma@example.com',
    'Phone Number': '9876543212',
    'College Name': 'VNR Vignana Jyothi Institute of Engineering',
    'Course / Branch': 'Artificial Intelligence & Machine Learning',
  },
  {
    'Student Name': 'Sneha Patel',
    'Hall Ticket Number': '21B91A0504',
    'Email Address': 'sneha.patel@example.com',
    'Phone Number': '9876543213',
    'College Name': 'VNR Vignana Jyothi Institute of Engineering',
    'Course / Branch': 'Artificial Intelligence & Machine Learning',
  },
  {
    'Student Name': 'Karthik Rao',
    'Hall Ticket Number': '21B91A0505',
    'Email Address': 'karthik.rao@example.com',
    'Phone Number': '9876543214',
    'College Name': 'Chaitanya Bharathi Institute of Technology',
    'Course / Branch': 'Cloud Computing & DevOps',
  },
];

// Create a new workbook and worksheet
const worksheet = XLSX.utils.json_to_sheet(data);

// Define column widths for optimal legibility
worksheet['!cols'] = [
  { wch: 22 }, // Student Name
  { wch: 22 }, // Hall Ticket Number
  { wch: 32 }, // Email Address
  { wch: 18 }, // Phone Number
  { wch: 42 }, // College Name
  { wch: 35 }, // Course / Branch
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

// Ensure output directories exist
const publicDir = path.resolve('public');
const templatesDir = path.resolve('public', 'templates');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

// Write XLSX to public directory
const xlsxPath = path.join(publicDir, 'codeneksa_student_template.xlsx');
const xlsxTemplatesPath = path.join(templatesDir, 'codeneksa_student_template.xlsx');

XLSX.writeFile(workbook, xlsxPath);
XLSX.writeFile(workbook, xlsxTemplatesPath);

// Also generate CSV version for convenience
const csvContent = XLSX.utils.sheet_to_csv(worksheet);
const csvPath = path.join(publicDir, 'codeneksa_student_template.csv');
const csvTemplatesPath = path.join(templatesDir, 'codeneksa_student_template.csv');

fs.writeFileSync(csvPath, csvContent, 'utf-8');
fs.writeFileSync(csvTemplatesPath, csvContent, 'utf-8');

console.log('Successfully generated:');
console.log(' - ' + xlsxPath);
console.log(' - ' + xlsxTemplatesPath);
console.log(' - ' + csvPath);
console.log(' - ' + csvTemplatesPath);
