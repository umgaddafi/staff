<?php

namespace App\Services;

use ZipArchive;
use SimpleXMLElement;
use Exception;

class XlsxParserService
{
    /**
     * Parses an uploaded spreadsheet file (.xlsx, XML, or CSV) into an array of associative rows.
     *
     * @param string $filePath Absolute path to the spreadsheet file
     * @return array<int, array<string, mixed>> List of rows keyed by column headers
     * @throws Exception
     */
    public function parse(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new Exception("Spreadsheet file does not exist: {$filePath}");
        }

        // 1. Try OpenXML (.xlsx ZIP package)
        $zip = new ZipArchive();
        if ($zip->open($filePath) === true) {
            try {
                $rows = $this->parseOpenXmlXlsx($zip);
                $zip->close();
                if (!empty($rows)) {
                    return $rows;
                }
            } catch (\Throwable $e) {
                $zip->close();
                // Fall through to other formats
            }
        }

        // 2. Try XML Spreadsheet 2003
        $content = file_get_contents($filePath, false, null, 0, 4096);
        if (str_contains($content, 'urn:schemas-microsoft-com:office:spreadsheet') || str_contains($content, '<Workbook')) {
            return $this->parseXmlSpreadsheet($filePath);
        }

        // 3. Fallback: CSV
        return $this->parseCsv($filePath);
    }

    /**
     * Parse native OpenXML .xlsx ZIP package
     */
    protected function parseOpenXmlXlsx(ZipArchive $zip): array
    {
        // Read shared strings if present
        $sharedStrings = [];
        $ssIndex = $zip->locateName('xl/sharedStrings.xml');
        if ($ssIndex !== false) {
            $ssXml = $zip->getFromIndex($ssIndex);
            if ($ssXml) {
                $xmlObj = simplexml_load_string($ssXml);
                if ($xmlObj && isset($xmlObj->si)) {
                    foreach ($xmlObj->si as $si) {
                        if (isset($si->t)) {
                            $sharedStrings[] = (string) $si->t;
                        } elseif (isset($si->r)) {
                            // Rich text run
                            $textRun = '';
                            foreach ($si->r as $r) {
                                $textRun .= (string) $r->t;
                            }
                            $sharedStrings[] = $textRun;
                        } else {
                            $sharedStrings[] = '';
                        }
                    }
                }
            }
        }

        // Find primary sheet
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (!$sheetXml) {
            // Find first sheet available in xl/worksheets/
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetXml = $zip->getFromIndex($i);
                    break;
                }
            }
        }

        if (!$sheetXml) {
            throw new Exception("Unable to locate worksheet XML in .xlsx package.");
        }

        $sheetObj = simplexml_load_string($sheetXml);
        if (!$sheetObj || !isset($sheetObj->sheetData->row)) {
            return [];
        }

        $matrix = [];
        foreach ($sheetObj->sheetData->row as $row) {
            $rowIndex = (int) $row['r'];
            $rowData = [];
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                $colLetters = preg_replace('/[0-9]/', '', $ref);
                $colIdx = $this->columnLettersToIndex($colLetters);

                $type = (string) $c['t'];
                $val = '';

                if ($type === 's') {
                    // Shared string lookup
                    $valIdx = (int) $c->v;
                    $val = $sharedStrings[$valIdx] ?? '';
                } elseif ($type === 'inlineStr' && isset($c->is->t)) {
                    $val = (string) $c->is->t;
                } elseif (isset($c->v)) {
                    $val = (string) $c->v;
                }

                $rowData[$colIdx] = trim($val);
            }
            $matrix[$rowIndex] = $rowData;
        }

        return $this->formatMatrixToAssocRows($matrix);
    }

    /**
     * Parse XML Spreadsheet 2003
     */
    protected function parseXmlSpreadsheet(string $filePath): array
    {
        $xmlContent = file_get_contents($filePath);
        $xml = simplexml_load_string($xmlContent);
        if (!$xml) {
            return [];
        }

        $xml->registerXPathNamespace('ss', 'urn:schemas-microsoft-com:office:spreadsheet');
        $rows = $xml->xpath('//ss:Row');

        $matrix = [];
        $r = 1;
        foreach ($rows as $row) {
            $rowData = [];
            $c = 0;
            foreach ($row->xpath('ss:Cell') as $cell) {
                $cellAttrs = $cell->attributes('urn:schemas-microsoft-com:office:spreadsheet');
                if (isset($cellAttrs['Index'])) {
                    $c = ((int) $cellAttrs['Index']) - 1;
                }
                $data = $cell->xpath('ss:Data');
                $val = !empty($data) ? (string) $data[0] : '';
                $rowData[$c] = trim($val);
                $c++;
            }
            $matrix[$r] = $rowData;
            $r++;
        }

        return $this->formatMatrixToAssocRows($matrix);
    }

    /**
     * Parse CSV fallback
     */
    protected function parseCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) return [];

        $matrix = [];
        $r = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $matrix[$r] = array_map('trim', $row);
            $r++;
        }
        fclose($handle);

        return $this->formatMatrixToAssocRows($matrix);
    }

    /**
     * Converts a 2D matrix (first non-empty row is header) to array of associative rows
     */
    protected function formatMatrixToAssocRows(array $matrix): array
    {
        if (empty($matrix)) {
            return [];
        }

        ksort($matrix);

        // Locate header row
        $headers = [];
        $dataStartIndex = null;

        foreach ($matrix as $rIdx => $cols) {
            // Find a row that has at least 3 non-empty values
            $filled = array_filter($cols, fn($v) => $v !== null && $v !== '');
            if (count($filled) >= 3) {
                // Check if this row looks like header (e.g. contains 'PF' or 'STAFF' or 'NAME')
                $joined = strtoupper(implode(' ', $filled));
                if (str_contains($joined, 'PF') || str_contains($joined, 'STAFF') || str_contains($joined, 'NAME') || str_contains($joined, 'NUMBER')) {
                    $maxCol = max(array_keys($cols));
                    for ($c = 0; $c <= $maxCol; $c++) {
                        $rawHeader = strtoupper(trim($cols[$c] ?? "COL_{$c}"));
                        // Clean header to standard snake_case key
                        $cleanHeader = preg_replace('/[^A-Z0-9_]/', '_', $rawHeader);
                        $cleanHeader = trim(preg_replace('/_+/', '_', $cleanHeader), '_');
                        $headers[$c] = $cleanHeader ?: "COL_{$c}";
                    }
                    $dataStartIndex = $rIdx + 1;
                    break;
                }
            }
        }

        if ($dataStartIndex === null || empty($headers)) {
            // Fallback: take first row as headers
            $firstKey = array_key_first($matrix);
            $cols = $matrix[$firstKey];
            $maxCol = max(array_keys($cols));
            for ($c = 0; $c <= $maxCol; $c++) {
                $rawHeader = strtoupper(trim($cols[$c] ?? "COL_{$c}"));
                $cleanHeader = preg_replace('/[^A-Z0-9_]/', '_', $rawHeader);
                $cleanHeader = trim(preg_replace('/_+/', '_', $cleanHeader), '_');
                $headers[$c] = $cleanHeader ?: "COL_{$c}";
            }
            $dataStartIndex = $firstKey + 1;
        }

        $result = [];
        foreach ($matrix as $rIdx => $cols) {
            if ($rIdx < $dataStartIndex) {
                continue;
            }

            // Skip completely empty rows
            $filled = array_filter($cols, fn($v) => $v !== null && $v !== '');
            if (empty($filled)) {
                continue;
            }

            $rowObj = [];
            foreach ($headers as $colIdx => $headerKey) {
                $rowObj[$headerKey] = $cols[$colIdx] ?? '';
            }

            $result[] = $rowObj;
        }

        return $result;
    }

    /**
     * Converts Excel column letter sequence (e.g. 'A', 'B', 'Z', 'AA', 'AB') to 0-based index.
     */
    protected function columnLettersToIndex(string $letters): int
    {
        $letters = strtoupper(trim($letters));
        $len = strlen($letters);
        $idx = 0;
        for ($i = 0; $i < $len; $i++) {
            $idx = $idx * 26 + (ord($letters[$i]) - 64);
        }
        return max(0, $idx - 1);
    }
}
