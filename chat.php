<?php
// chat.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

include __DIR__ . '/chat_config.php';
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" . $apiKey;


$input = json_decode(file_get_contents('php://input'), true);
$history = $input['history'] ?? [];
$site_id = $input['site_id'] ?? 'wavedreamkr';



function fetchGithubFile($url){
  $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    $content = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ($http_code == 200 && $content !== false) ? $content : "";
}


// 글로벌 프롬프트
$global_url = "https://raw.githubusercontent.com/nanumdream-developer/site-manual/main/global.txt?t=" . time();
$global_prompt = fetchGithubFile($global_url);

// 매뉴얼 프롬프트
$site_url = "https://raw.githubusercontent.com/nanumdream-developer/site-manual/main/" . $site_id . ".txt?t=" . time();
$site_manual = fetchGithubFile($site_url);


if (!empty($global_prompt) && !empty($site_manual)) {
  $systemInstruction = $global_prompt . "\n\n[개별 사이트 추가 매뉴얼]\n" . $site_manual;
} else {
  $systemInstruction = !empty($global_prompt) ? $global_prompt : "너는 친절한 AI 상담원이야. 고객센터(010-4882-1779, 010-7904-1779, 010-8263-1779)로 안내해줘.";
}


$data = [
  "system_instruction" => [
    "parts" => [
      ["text" => $systemInstruction]
    ]
  ],
  "contents" => $history
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>