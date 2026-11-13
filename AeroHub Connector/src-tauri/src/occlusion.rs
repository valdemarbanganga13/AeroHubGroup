// Saber se a janela do app está tapada por completo por outras janelas do Windows.
// Serve para abrir sozinha a mini janela do status (Definições → "Fixar estado no ecrã").
//
// Como funciona: parte do retângulo da janela do app e vai tirando o espaço de cada janela
// que está à frente dela. Se não sobrar nada, o app está tapado.
// Ignora: janelas invisíveis ou minimizadas, janelas "escondidas" pelo Windows (cloaked),
// camadas transparentes por onde passam os cliques (overlays) e as janelas do próprio app
// (como a mini janela).
// Usado por pip.rs sempre que o Windows avisa que alguma janela mudou.

#[cfg(windows)]
pub use win32::is_covered;

#[cfg(windows)]
mod win32 {
    use std::{ffi::c_void, mem};
    use windows_sys::Win32::{
        Foundation::{HWND, RECT},
        Graphics::{
            Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS},
            Gdi::{CombineRgn, CreateRectRgnIndirect, DeleteObject, NULLREGION, RGN_DIFF},
        },
        System::Threading::GetCurrentProcessId,
        UI::WindowsAndMessaging::{
            GetWindow, GetWindowLongW, GetWindowRect, GetWindowThreadProcessId, IsIconic,
            IsWindowVisible, GWL_EXSTYLE, GW_HWNDPREV, WS_EX_TRANSPARENT,
        },
    };

    pub unsafe fn is_covered(hwnd: HWND) -> bool {
        // Minimizado não conta como "tapado" (isso é tratado à parte)
        if IsIconic(hwnd) != 0 || IsWindowVisible(hwnd) == 0 {
            return false;
        }
        let mut rect: RECT = mem::zeroed();
        if GetWindowRect(hwnd, &mut rect) == 0 {
            return false;
        }

        let visible = CreateRectRgnIndirect(&rect);
        let own_process = GetCurrentProcessId();
        let mut covered = false;

        // Janelas à frente do app, da mais próxima para a mais distante
        let mut above = GetWindow(hwnd, GW_HWNDPREV);
        while !above.is_null() {
            if let Some(other_rect) = covering_rect(above, own_process) {
                let other = CreateRectRgnIndirect(&other_rect);
                let left = CombineRgn(visible, visible, other, RGN_DIFF);
                DeleteObject(other);
                if left == NULLREGION {
                    covered = true;
                    break;
                }
            }
            above = GetWindow(above, GW_HWNDPREV);
        }

        DeleteObject(visible);
        covered
    }

    // O espaço que uma janela tapa de verdade, ou None se não deve contar
    unsafe fn covering_rect(hwnd: HWND, own_process: u32) -> Option<RECT> {
        if IsWindowVisible(hwnd) == 0 || IsIconic(hwnd) != 0 {
            return None;
        }

        let mut cloaked: u32 = 0;
        let cloaked_ok = DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED as _,
            &mut cloaked as *mut u32 as *mut c_void,
            mem::size_of::<u32>() as u32,
        );
        if cloaked_ok == 0 && cloaked != 0 {
            return None;
        }

        if (GetWindowLongW(hwnd, GWL_EXSTYLE) as u32) & WS_EX_TRANSPARENT != 0 {
            return None;
        }

        let mut process = 0u32;
        GetWindowThreadProcessId(hwnd, &mut process);
        if process == own_process {
            return None;
        }

        // Tamanho visível (sem as bordas invisíveis que o Windows 10/11 põe à volta)
        let mut rect: RECT = mem::zeroed();
        let bounds_ok = DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS as _,
            &mut rect as *mut RECT as *mut c_void,
            mem::size_of::<RECT>() as u32,
        );
        if bounds_ok != 0 && GetWindowRect(hwnd, &mut rect) == 0 {
            return None;
        }
        if rect.right <= rect.left || rect.bottom <= rect.top {
            return None;
        }
        Some(rect)
    }
}
