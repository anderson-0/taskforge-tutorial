import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

  it("opens from its trigger, renders every content region, and closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <button type="button">Open release details</button>
        </DialogTrigger>
        <DialogContent className="custom-dialog">
          <DialogHeader className="custom-header">
            <DialogTitle className="custom-title">Release details</DialogTitle>
            <DialogDescription className="custom-description">
              Review the deployment checklist.
            </DialogDescription>
          </DialogHeader>
          <p>Production is ready.</p>
          <DialogFooter className="custom-footer">
            <DialogClose asChild>
              <button type="button">Cancel review</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open release details" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("custom-dialog");
    expect(screen.getByRole("heading", { name: "Release details" }))
      .toHaveClass("custom-title");
    expect(screen.getByText("Review the deployment checklist."))
      .toHaveClass("custom-description");
    expect(screen.getByText("Production is ready.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel review" }).parentElement)
      .toHaveClass("custom-footer");
    expect(document.querySelector("[data-state='open'].fixed.inset-0"))
      .toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Cancel review" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("provides an accessible built-in close control", async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Quick view</DialogTitle>
          <DialogDescription>Temporary details.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("allows a portal and overlay to be composed directly", () => {
    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogOverlay
            className="custom-overlay"
            data-testid="standalone-overlay"
          />
        </DialogPortal>
      </Dialog>,
    );

    expect(screen.getByTestId("standalone-overlay"))
      .toHaveClass("fixed", "inset-0", "custom-overlay");
  });
