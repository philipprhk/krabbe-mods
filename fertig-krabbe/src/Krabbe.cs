// Fertig-Krabbe: spielt einen kurzen Ton und lässt die Claude-Krabbe unten rechts
// aus der Taskleiste hüpfen und winken. Wird vom Mod gestartet, sobald Claude fertig ist
// (oder mit --frage, sobald Claude eine Rückfrage hat oder eine Freigabe braucht).
// Bauen mit build.ps1 (nutzt den C#-Compiler, der bei Windows dabei ist).
//
// Aufruf: krabbe.exe [--frage] [--titel <text>] [--leise] [--ohne-krabbe] [--ton <datei.wav>]
using System;
using System.Diagnostics;
using System.IO;
using System.Media;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Shapes;
using Path = System.Windows.Shapes.Path;

namespace FertigKrabbe
{
    class Optionen
    {
        public bool Jetzt;
        public bool Leise;
        public bool OhneKrabbe;
        public bool Frage;
        public string Titel = "";
        public string Ton;

        public static Optionen Lesen(string[] args)
        {
            Optionen o = new Optionen();
            for (int i = 0; i < args.Length; i++)
            {
                string a = args[i];
                if (a == "--jetzt") o.Jetzt = true;
                else if (a == "--leise") o.Leise = true;
                else if (a == "--ohne-krabbe") o.OhneKrabbe = true;
                else if (a == "--frage") o.Frage = true;
                else if (a == "--titel" && i + 1 < args.Length) o.Titel = args[++i];
                else if (a == "--ton" && i + 1 < args.Length) o.Ton = args[++i];
            }
            return o;
        }

        public string AlsArgumente()
        {
            StringBuilder sb = new StringBuilder("--jetzt");
            if (Leise) sb.Append(" --leise");
            if (OhneKrabbe) sb.Append(" --ohne-krabbe");
            if (Frage) sb.Append(" --frage");
            if (Titel.Length > 0) sb.Append(" --titel ").Append(Zitieren(Titel));
            if (Ton != null) sb.Append(" --ton ").Append(Zitieren(Ton));
            return sb.ToString();
        }

        // Windows-Regeln für Befehlszeilen: Anführungszeichen und Backslashes davor maskieren.
        static string Zitieren(string s)
        {
            StringBuilder sb = new StringBuilder("\"");
            int striche = 0;
            foreach (char c in s)
            {
                if (c == '\\') { striche++; continue; }
                if (c == '"') { sb.Append('\\', striche * 2 + 1).Append('"'); striche = 0; continue; }
                sb.Append('\\', striche).Append(c);
                striche = 0;
            }
            sb.Append('\\', striche * 2).Append('"');
            return sb.ToString();
        }
    }

    static class Programm
    {
        // Referenz halten, solange der Ton im Hintergrund läuft.
        static SoundPlayer spieler;

        [STAThread]
        static int Main(string[] args)
        {
            try
            {
                Optionen opt = Optionen.Lesen(args);
                if (!opt.Jetzt)
                {
                    // Sofort ablösen, damit Claude Code nicht auf die Animation warten muss.
                    ProcessStartInfo psi = new ProcessStartInfo(Process.GetCurrentProcess().MainModule.FileName, opt.AlsArgumente());
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                    return 0;
                }

                bool istErste;
                using (Mutex sperre = new Mutex(true, @"Local\ClaudeFertigKrabbe", out istErste))
                {
                    // Enden zwei Sitzungen gleichzeitig, winkt nur eine Krabbe.
                    if (!istErste) return 0;

                    if (opt.OhneKrabbe)
                    {
                        if (!opt.Leise) TonSpielen(opt.Ton, opt.Frage, true);
                    }
                    else
                    {
                        if (!opt.Leise) TonSpielen(opt.Ton, opt.Frage, false);
                        Application app = new Application();
                        app.Run(new KrabbenFenster(opt.Titel, opt.Frage));
                    }
                    sperre.ReleaseMutex();
                }
                return 0;
            }
            catch (Exception fehler)
            {
                Protokoll(fehler);
                return 1;
            }
        }

        static void TonSpielen(string datei, bool frage, bool abwarten)
        {
            if (datei != null && File.Exists(datei)) spieler = new SoundPlayer(datei);
            else spieler = new SoundPlayer(new MemoryStream(frage ? Frageton() : Glocke()));
            spieler.Load();
            if (abwarten) spieler.PlaySync();
            else spieler.Play();
        }

        // Fertig: kleiner aufsteigender Dreiklang (G5, C6, E6) mit weichem Ausklang.
        static byte[] Glocke()
        {
            return Klang(0.9, 6.0, 0.25, 0.0, new double[] { 783.99, 1046.50, 1318.51 },
                new double[] { 0.0, 0.085, 0.17 }, new double[] { 0.7, 0.75, 0.9 });
        }

        // Rückfrage: zwei kurze, hellere Töne (H5, E6), der zweite zieht nach oben wie ein „hm?“.
        static byte[] Frageton()
        {
            return Klang(0.75, 9.0, 0.4, 0.05, new double[] { 987.77, 1318.51 },
                new double[] { 0.0, 0.16 }, new double[] { 0.8, 0.9 });
        }

        // Baut eine WAV im Speicher aus Sinustönen mit Anschlag, Ausklang und etwas Oberton.
        // anheben: um wie viel der letzte Ton in seinen ersten 0,15 s nach oben zieht (0,05 = 5 %).
        static byte[] Klang(double dauer, double zerfall, double oberton, double anheben,
            double[] frequenz, double[] einsatz, double[] staerke)
        {
            const int rate = 44100;
            int n = (int)(rate * dauer);
            double[] werte = new double[n];

            for (int k = 0; k < frequenz.Length; k++)
            {
                int start = (int)(einsatz[k] * rate);
                bool zieht = k == frequenz.Length - 1 && anheben > 0;
                double phase = 0;
                for (int i = start; i < n; i++)
                {
                    double t = (i - start) / (double)rate;
                    double f = frequenz[k] * (zieht ? 1 + anheben * Math.Min(1.0, t / 0.15) : 1);
                    phase += 2 * Math.PI * f / rate;
                    double anschlag = Math.Min(1.0, t / 0.006);
                    double huelle = anschlag * Math.Exp(-t * zerfall);
                    double ton = Math.Sin(phase) + oberton * Math.Sin(2 * phase) * Math.Exp(-t * 10.0);
                    werte[i] += ton * huelle * staerke[k];
                }
            }

            double spitze = 0;
            foreach (double w in werte) spitze = Math.Max(spitze, Math.Abs(w));
            double faktor = 0.32 / spitze;
            int ausblenden = (int)(rate * 0.03);

            MemoryStream ms = new MemoryStream();
            BinaryWriter bw = new BinaryWriter(ms);
            bw.Write(Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + n * 2);
            bw.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)1);
            bw.Write(rate);
            bw.Write(rate * 2);
            bw.Write((short)2);
            bw.Write((short)16);
            bw.Write(Encoding.ASCII.GetBytes("data"));
            bw.Write(n * 2);
            for (int i = 0; i < n; i++)
            {
                double ende = Math.Min(1.0, (n - i) / (double)ausblenden);
                bw.Write((short)(werte[i] * faktor * ende * short.MaxValue));
            }
            bw.Flush();
            return ms.ToArray();
        }

        static void Protokoll(Exception fehler)
        {
            try
            {
                string pfad = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "fertig-krabbe.log");
                File.AppendAllText(pfad, DateTime.Now.ToString("s") + " " + fehler + Environment.NewLine);
            }
            catch
            {
            }
        }
    }

    class KrabbenFenster : Window
    {
        // Ein Krabben-Pixel ist doppelt so hoch wie breit, wie die Viertelblöcke im Terminal.
        const double PB = 8;
        const double PH = 16;
        const double KB = 18 * PB;
        const double KH = 5 * PH;
        const double FB = 300;
        const double FH = 220;
        const double VERSTECKT = KH + 14;
        // Bei einer Rückfrage bleibt die Krabbe eine Sekunde länger.
        const double FRAGE_EXTRA = 1.0;

        // Die Krabbe aus dem Claude-Code-Startbildschirm, Pixel für Pixel.
        // # Körper, E Auge, A rechter Arm (winkt, wird extra gezeichnet)
        static readonly string[] BILD =
        {
            "...############...",
            "...##E######E##...",
            ".##############AA.",
            "...############...",
            "....#.#....#.#....",
        };

        static readonly Brush ORANGE = Fest(new SolidColorBrush(Color.FromRgb(0xD9, 0x77, 0x57)));
        static readonly Brush AUGE = Fest(new SolidColorBrush(Color.FromRgb(0x14, 0x14, 0x13)));
        static readonly Brush CREME = Fest(new SolidColorBrush(Color.FromRgb(0xFA, 0xF9, 0xF5)));
        static readonly Brush TINTE = Fest(new SolidColorBrush(Color.FromRgb(0x1F, 0x1E, 0x1D)));
        static readonly Brush GRAU = Fest(new SolidColorBrush(Color.FromRgb(0x73, 0x72, 0x6C)));

        readonly TranslateTransform hub = new TranslateTransform();
        readonly ScaleTransform quetsch = new ScaleTransform(1, 1, KB / 2, KH);
        readonly RotateTransform neigung = new RotateTransform(0, KB / 2, KH);
        readonly ScaleTransform blasenGroesse = new ScaleTransform(1, 1);
        readonly Stopwatch uhr = new Stopwatch();
        readonly bool frage;
        readonly double winkEnde;
        readonly double abtauchen;
        readonly double ende;
        ScaleTransform armLaenge;
        RotateTransform armWinkel;
        ScaleTransform lid;
        FrameworkElement blase;
        bool zu;

        public KrabbenFenster(string titel, bool frage)
        {
            this.frage = frage;
            double extra = frage ? FRAGE_EXTRA : 0;
            winkEnde = 2.95 + extra;
            abtauchen = 3.05 + extra;
            ende = 3.55 + extra;

            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            Topmost = true;
            ShowInTaskbar = false;
            ShowActivated = false;
            Focusable = false;
            ResizeMode = ResizeMode.NoResize;
            Title = "Fertig-Krabbe";
            Width = FB;
            Height = FH;

            // Unterkante des Fensters = Oberkante der Taskleiste: die Krabbe kommt aus ihr heraus.
            Rect flaeche = SystemParameters.WorkArea;
            Left = flaeche.Right - FB - 6;
            Top = flaeche.Bottom - FH;

            Canvas buehne = new Canvas();
            buehne.Width = FB;
            buehne.Height = FH;
            buehne.ClipToBounds = true;
            Content = buehne;

            double krabbeLinks = FB - KB - 26;
            Canvas krabbe = BaueKrabbe();
            Canvas.SetLeft(krabbe, krabbeLinks);
            Canvas.SetTop(krabbe, FH - KH);
            TransformGroup bewegung = new TransformGroup();
            bewegung.Children.Add(quetsch);
            bewegung.Children.Add(neigung);
            bewegung.Children.Add(hub);
            krabbe.RenderTransform = bewegung;
            hub.Y = VERSTECKT;

            blase = BaueBlase(titel, frage);
            blase.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            Size groesse = blase.DesiredSize;
            Canvas.SetLeft(blase, Math.Max(4, krabbeLinks + KB * 0.42 - groesse.Width));
            Canvas.SetTop(blase, FH - KH - 6 - groesse.Height);
            blasenGroesse.CenterX = groesse.Width;
            blasenGroesse.CenterY = groesse.Height;
            blase.RenderTransform = blasenGroesse;
            blase.Opacity = 0;

            buehne.Children.Add(blase);
            buehne.Children.Add(krabbe);

            SourceInitialized += delegate { Durchklickbar(); };
            Loaded += delegate
            {
                uhr.Start();
                CompositionTarget.Rendering += Zeichnen;
            };
        }

        Canvas BaueKrabbe()
        {
            Canvas c = new Canvas();
            c.Width = KB;
            c.Height = KH;

            GeometryGroup koerper = new GeometryGroup();
            GeometryGroup augen = new GeometryGroup();
            for (int r = 0; r < BILD.Length; r++)
            {
                for (int s = 0; s < BILD[r].Length; s++)
                {
                    char z = BILD[r][s];
                    Rect zelle = new Rect(s * PB, r * PH, PB, PH);
                    if (z == '#' || z == 'E') koerper.Children.Add(new RectangleGeometry(zelle));
                    if (z == 'E') augen.Children.Add(new RectangleGeometry(zelle));
                }
            }

            // Der Arm ragt ein Stück in den Körper, damit beim Drehen keine Lücke entsteht.
            const double rein = 5;
            Rectangle arm = new Rectangle();
            arm.Width = 2 * PB + rein;
            arm.Height = PH;
            arm.Fill = ORANGE;
            Canvas.SetLeft(arm, 15 * PB - rein);
            Canvas.SetTop(arm, 2 * PH);
            armLaenge = new ScaleTransform(1, 1, rein, PH / 2);
            armWinkel = new RotateTransform(0, rein, PH / 2);
            TransformGroup armBewegung = new TransformGroup();
            armBewegung.Children.Add(armLaenge);
            armBewegung.Children.Add(armWinkel);
            arm.RenderTransform = armBewegung;

            Path k = new Path();
            k.Data = koerper;
            k.Fill = ORANGE;

            Path a = new Path();
            a.Data = augen;
            a.Fill = AUGE;
            lid = new ScaleTransform(1, 1, 0, 1.5 * PH);
            a.RenderTransform = lid;

            c.Children.Add(arm);
            c.Children.Add(k);
            c.Children.Add(a);
            RenderOptions.SetEdgeMode(c, EdgeMode.Aliased);

            DropShadowEffect schatten = new DropShadowEffect();
            schatten.Color = Colors.Black;
            schatten.BlurRadius = 10;
            schatten.ShadowDepth = 2;
            schatten.Direction = 270;
            schatten.Opacity = 0.35;
            c.Effect = schatten;
            return c;
        }

        FrameworkElement BaueBlase(string titel, bool frage)
        {
            StackPanel text = new StackPanel();
            TextBlock gross = new TextBlock();
            gross.Text = frage ? "Rückfrage" : "Fertig!";
            gross.FontFamily = new FontFamily("Segoe UI");
            gross.FontSize = 15;
            gross.FontWeight = FontWeights.SemiBold;
            gross.Foreground = TINTE;
            text.Children.Add(gross);
            if (!string.IsNullOrEmpty(titel))
            {
                TextBlock klein = new TextBlock();
                klein.Text = titel;
                klein.FontFamily = new FontFamily("Segoe UI");
                klein.FontSize = 11.5;
                klein.Foreground = GRAU;
                klein.MaxWidth = 170;
                klein.TextTrimming = TextTrimming.CharacterEllipsis;
                text.Children.Add(klein);
            }

            Border feld = new Border();
            feld.Child = text;
            feld.Background = CREME;
            feld.CornerRadius = new CornerRadius(10);
            feld.Padding = new Thickness(12, 6, 12, 7);

            // Kleiner Zipfel unten rechts, der auf die Krabbe zeigt.
            Path zipfel = new Path();
            zipfel.Data = Geometry.Parse("M 0,0 L 14,0 L 12,9 Z");
            zipfel.Fill = CREME;
            zipfel.HorizontalAlignment = HorizontalAlignment.Right;
            zipfel.Margin = new Thickness(0, -1, 16, 0);

            StackPanel blase = new StackPanel();
            blase.Children.Add(feld);
            blase.Children.Add(zipfel);

            DropShadowEffect schatten = new DropShadowEffect();
            schatten.Color = Colors.Black;
            schatten.BlurRadius = 12;
            schatten.ShadowDepth = 2;
            schatten.Direction = 270;
            schatten.Opacity = 0.3;
            blase.Effect = schatten;
            return blase;
        }

        void Zeichnen(object sender, EventArgs e)
        {
            double t = uhr.Elapsed.TotalSeconds;
            if (t >= ende)
            {
                if (!zu)
                {
                    zu = true;
                    CompositionTarget.Rendering -= Zeichnen;
                    Close();
                }
                return;
            }

            double y = 0, sx = 1, sy = 1;
            if (t < 0.50)
            {
                // Sprung aus der Taskleiste: Bogen bis etwas über die Kante, dann Landung.
                double u = t / 0.50;
                y = VERSTECKT * (1 - u) - 240 * u * (1 - u);
                double streck = Math.Sin(Math.PI * u);
                sy = 1 + 0.10 * streck;
                sx = 1 - 0.07 * streck;
            }
            else if (t < 0.72)
            {
                Federn(t - 0.50, 0.18, ref sx, ref sy);
            }
            else if (t < 1.08)
            {
                // Kleiner zweiter Hüpfer.
                double u = (t - 0.72) / 0.36;
                y = -88 * u * (1 - u);
                double streck = Math.Sin(Math.PI * u);
                sy = 1 + 0.06 * streck;
                sx = 1 - 0.04 * streck;
            }
            else if (t < abtauchen)
            {
                Federn(t - 1.08, 0.12, ref sx, ref sy);
            }
            else
            {
                // Zurück in die Taskleiste.
                double u = (t - abtauchen) / (ende - abtauchen);
                y = VERSTECKT * u * u;
            }

            // Winken: Arm hoch, hin und her, wieder runter.
            double hoch = Glatt((t - 1.00) / 0.15) * Glatt((winkEnde - t) / 0.15);
            double wackeln = Math.Sin(2 * Math.PI * 3.0 * (t - 1.00));
            armWinkel.Angle = hoch * (-52 + 22 * wackeln);
            armLaenge.ScaleX = 1 + 0.9 * hoch;
            armLaenge.ScaleY = 1 - 0.4 * hoch;

            // Bei einer Rückfrage legt die Krabbe fragend den Kopf schief, zur Sprechblase hin.
            if (frage)
            {
                double schief = Glatt((t - 1.10) / 0.25) * Glatt((winkEnde - t) / 0.25);
                neigung.Angle = schief * (-9 + 1.5 * Math.Sin(2 * Math.PI * 1.2 * (t - 1.10)));
            }

            // Einmal blinzeln.
            lid.ScaleY = (t > 2.15 && t < 2.27) ? 0.15 : 1;

            // Sprechblase.
            double sicht = Glatt((t - 0.95) / 0.2) * Glatt((abtauchen - t) / 0.2);
            blase.Opacity = sicht;
            blasenGroesse.ScaleX = blasenGroesse.ScaleY = 0.85 + 0.15 * sicht;

            hub.Y = y;
            quetsch.ScaleX = sx;
            quetsch.ScaleY = sy;
        }

        // Gedämpftes Nachfedern nach einer Landung (breit und flach, dann wieder normal).
        static void Federn(double dt, double staerke, ref double sx, ref double sy)
        {
            double s = staerke * Math.Exp(-dt * 16) * Math.Cos(dt * 34);
            sy = 1 - s;
            sx = 1 + s * 0.8;
        }

        static double Glatt(double x)
        {
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            return x * x * (3 - 2 * x);
        }

        static Brush Fest(Brush b)
        {
            b.Freeze();
            return b;
        }

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr fenster, int index);

        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr fenster, int index, int wert);

        // Klicks gehen durch die Krabbe hindurch, sie nimmt keinen Fokus und taucht nicht in Alt+Tab auf.
        void Durchklickbar()
        {
            const int GWL_EXSTYLE = -20;
            const int WS_EX_TRANSPARENT = 0x20;
            const int WS_EX_TOOLWINDOW = 0x80;
            const int WS_EX_NOACTIVATE = 0x08000000;
            IntPtr h = new WindowInteropHelper(this).Handle;
            SetWindowLong(h, GWL_EXSTYLE, GetWindowLong(h, GWL_EXSTYLE) | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
        }
    }
}
