import CoreGraphics
import Foundation

class ClickHelper {
    static func clickAtPoint(_ point: CGPoint) {
        let source = CGEventSource(stateID: .combinedSessionState)
        
        // Move mouse to the point
        let move = CGEvent(mouseEventSource: source, mouseType: .mouseMoved,
                           mouseCursorPosition: point, mouseButton: .left)
        move?.post(tap: .cghidEventTap)
        
        // Small delay to ensure the move is processed
        Thread.sleep(forTimeInterval: 0.05)
        
        // Left mouse down
        let mouseDown = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
                                mouseCursorPosition: point, mouseButton: .left)
        mouseDown?.post(tap: .cghidEventTap)
        
        // Small delay for the click to be registered
        Thread.sleep(forTimeInterval: 0.05)
        
        // Left mouse up
        let mouseUp = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
                              mouseCursorPosition: point, mouseButton: .left)
        mouseUp?.post(tap: .cghidEventTap)
    }
}
