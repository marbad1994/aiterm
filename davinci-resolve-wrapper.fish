#!/usr/bin/env fish
# Wrapper to launch DaVinci Resolve with system glib libraries
# Resolve 20.3.3 bundles glib 2.68 which conflicts with Arch's newer pango/gdk_pixbuf

set -x LD_PRELOAD "/usr/lib/libglib-2.0.so:/usr/lib/libgobject-2.0.so:/usr/lib/libgio-2.0.so:/usr/lib/libgmodule-2.0.so:/usr/lib/libgthread-2.0.so"

exec /opt/resolve/bin/resolve $argv
