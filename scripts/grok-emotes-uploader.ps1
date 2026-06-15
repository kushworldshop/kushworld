# === GROK CUSTOM EMOTES UPLOADER ===
# Run this to upload your custom emotes to Grok for use in chats or fun interactions.
# Place your 25 PNG files in the .\GrokEmotes folder with matching names.

$apiKey = "YOUR_GROK_API_KEY_HERE"          # ← Put your key here (get from x.ai)
$folderPath = ".\GrokEmotes"                # Folder with your 25 PNGs

# Create folder if needed
if (!(Test-Path $folderPath)) { New-Item -ItemType Directory -Path $folderPath }

# Full list of 25 emotes (match your PNG filenames)
$emotes = @(
    @{Name="joint_smile"; File="joint_smile.png"},
    @{Name="weed_sunglasses"; File="weed_sunglasses.png"},
    @{Name="trippy_eyes"; File="trippy_eyes.png"},
    @{Name="sleepy_beanie"; File="sleepy_beanie.png"},
    @{Name="happy_cloud"; File="happy_cloud.png"},
    @{Name="blazing_joint"; File="blazing_joint.png"},
    @{Name="munchies_face"; File="munchies_face.png"},
    @{Name="peace_leaf"; File="peace_leaf.png"},
    @{Name="chill_cloud"; File="chill_cloud.png"},
    @{Name="high_five"; File="high_five.png"},
    @{Name="sleepy_puff"; File="sleepy_puff.png"},
    @{Name="trippy_bud"; File="trippy_bud.png"},
    @{Name="happy_herb"; File="happy_herb.png"},
    @{Name="sunglass_joint"; File="sunglass_joint.png"},
    @{Name="cloud_nine"; File="cloud_nine.png"},
    @{Name="green_glow"; File="green_glow.png"},
    @{Name="puff_master"; File="puff_master.png"},
    @{Name="zen_bud"; File="zen_bud.png"},
    @{Name="laugh_leaf"; File="laugh_leaf.png"},
    @{Name="vibe_vape"; File="vibe_vape.png"},
    @{Name="couch_lock"; File="couch_lock.png"},
    @{Name="giggly_greens"; File="giggly_greens.png"},
    @{Name="fire_bud"; File="fire_bud.png"},
    @{Name="cosmic_canna"; File="cosmic_canna.png"},
    @{Name="mellow_mood"; File="mellow_mood.png"}
)

foreach ($emote in $emotes) {
    $filePath = Join-Path $folderPath $emote.File
    if (Test-Path $filePath) {
        $body = @{
            name = $emote.Name
            image = [Convert]::ToBase64String([IO.File]::ReadAllBytes($filePath))
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type"  = "application/json"
        }

        try {
            Invoke-RestMethod -Uri "https://api.x.ai/v1/assets/emotes" -Method Post -Headers $headers -Body $body
            Write-Host "✅ Uploaded: $($emote.Name)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed: $($emote.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Missing file: $($emote.File)" -ForegroundColor Yellow
    }
}

Write-Host "🎉 Emote upload complete!" -ForegroundColor Cyan
Write-Host "Use these emotes in Grok chats or integrate into your site reviews/products for fun interactions." -ForegroundColor Cyan