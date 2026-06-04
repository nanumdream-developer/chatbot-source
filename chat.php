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



$input = json_decode(file_get_contents('php://input'), true);
$history = $input['history'] ?? [];
$site_id = $input['site_id'] ?? 'wavedreamkr';



function fetchGithubFile($url){
  $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
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
  $systemInstruction = "[개별 사이트 매뉴얼]\n" . $site_manual . "\n\n================\n\n[상담원 절대 규칙]\n" . $global_prompt;
} else {
  $fallback_prompt = !empty($global_prompt) ? $global_prompt : "너는 아주 친절하고 다정한 AI 상담원이야. 매뉴얼을 불러올 수 없으니 고객에게 문의사항은 010-4882-1779, 010-7904-1779, 010-8263-1779로 안내해줘.";
  $systemInstruction = $fallback_prompt . "\n\n[중요 규칙: 너는 무조건 한국어로만 친절하게 대답해. 모르는 정보는 지어내지 말고 고객센터 전화번호를 알려줘.]\n\n[말투 규칙: \n1. 기계처럼 딱딱하게 리스트 형태로 번호만 나열하지 마.\n2. 고객과 직접 대화하듯, 사람처럼 자연스럽고 부드러운 문장으로 안내해 줘.\n3. 적절한 이모티콘(😊, 📞 등)을 가끔 섞어서 친근하게 표현해.\n4. 절대 모르는 정보를 지어내지 마.]";
}

// 통신
$url = "http://220.92.166.152:11434/api/chat";
$ollama_messages = [];
$ollama_messages[] = [
  "role" => "system",
  "content" => $systemInstruction
];

if(!empty($history)){
  foreach ($history as $msg){
    $ollama_messages[] = [
      "role" => $msg['role'],
      "content" => $msg['content']
    ];
  }
}

$data = [
  "model" => "qwen2.5:3b",
  "messages" => $ollama_messages,
  "stream" => false,
  "options" => [
    "temperature" => 0.1,
    "top_p" => 0.3,
    "repeat_penalty" => 1.2
  ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$responseData = json_decode($response, true);
if($http_code == 200 && isset($responseData['message']['content'])){
  $ai_reply = $responseData['message']['content'];

  $ai_reply = trim($ai_reply);

  echo json_encode(["reply" => $ai_reply]);
} else {
    // 503 과부하 대신 통신 오류 시 반환
    echo json_encode(["error" => ["code" => $http_code, "message" => "Ollama Server Error"]]);
}

?>