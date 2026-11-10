Set-Location "D:/KriyaOS-build-check"
$env:TMP='D:/KriyaOS-build-check/.tmp'
$env:TEMP='D:/KriyaOS-build-check/.tmp'
$env:NODE_OPTIONS='--max-old-space-size=2048'
$env:npm_config_cache='D:/npm-cache'
npm run build *>&1 | Tee-Object -FilePath 'D:/KriyaOS-build-check/build.log'
exit 
