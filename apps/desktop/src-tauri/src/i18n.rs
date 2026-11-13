pub struct NativeCopy {
    pub show: &'static str,
    pub pause: &'static str,
    pub resume: &'static str,
    pub quit: &'static str,
    pub completed: &'static str,
    pub failed: &'static str,
}

pub fn native_copy(locale: &str) -> NativeCopy {
    match locale {
        "zh-CN" => NativeCopy {
            show: "显示主窗口",
            pause: "暂停全部",
            resume: "继续全部",
            quit: "退出",
            completed: "下载完成",
            failed: "下载失败",
        },
        "zh-TW" => NativeCopy {
            show: "顯示主視窗",
            pause: "暫停全部",
            resume: "繼續全部",
            quit: "結束",
            completed: "下載完成",
            failed: "下載失敗",
        },
        "ja-JP" => NativeCopy {
            show: "ウィンドウを表示",
            pause: "すべて一時停止",
            resume: "すべて再開",
            quit: "終了",
            completed: "ダウンロード完了",
            failed: "ダウンロード失敗",
        },
        "ko-KR" => NativeCopy {
            show: "창 표시",
            pause: "모두 일시 정지",
            resume: "모두 재개",
            quit: "종료",
            completed: "다운로드 완료",
            failed: "다운로드 실패",
        },
        _ => NativeCopy {
            show: "Show window",
            pause: "Pause all",
            resume: "Resume all",
            quit: "Quit",
            completed: "Download complete",
            failed: "Download failed",
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_labels_cover_all_languages_and_fallback() {
        for locale in ["zh-CN", "zh-TW", "en-US", "ja-JP", "ko-KR"] {
            let copy = native_copy(locale);
            assert!(!copy.show.is_empty());
            assert!(!copy.completed.is_empty());
            assert!(!copy.failed.is_empty());
        }
        assert_eq!(native_copy("fr-FR").quit, "Quit");
        assert_eq!(native_copy("zh-TW").show, "顯示主視窗");
    }
}
