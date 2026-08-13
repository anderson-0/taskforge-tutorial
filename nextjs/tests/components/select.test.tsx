import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

class ResizeObserverMock implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

function installRadixDomShims(): void {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: jest.fn(() => false),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: jest.fn(),
  });
}

  beforeAll(() => {
    installRadixDomShims();
  });

  it("opens popper content and reports a selected item", async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();

    render(
      <Select defaultValue="medium" onValueChange={onValueChange}>
        <SelectTrigger aria-label="Priority" className="custom-trigger">
          <SelectValue placeholder="Choose priority" />
        </SelectTrigger>
        <SelectContent className="custom-content" data-testid="select-content">
          <SelectGroup>
            <SelectLabel className="custom-label">Priority</SelectLabel>
            <SelectItem className="custom-item" value="medium">
              Medium
            </SelectItem>
            <SelectSeparator className="custom-separator" />
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "Priority" });
    expect(trigger).toHaveTextContent("Medium");
    expect(trigger).toHaveClass("custom-trigger");

    await user.click(trigger);

    const content = await screen.findByTestId("select-content");
    expect(content).toHaveClass(
      "custom-content",
      "data-[side=bottom]:translate-y-1",
    );
    expect(screen.getByText("Priority")).toHaveClass("custom-label");
    expect(screen.getByRole("option", { name: "Medium" }))
      .toHaveClass("custom-item");
    expect(content.querySelector(".custom-separator"))
      .toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Urgent" }));

    expect(onValueChange).toHaveBeenCalledWith("urgent");
  });

  it("renders item-aligned content without popper translation classes", () => {
    render(
      <Select open defaultValue="todo">
        <SelectTrigger aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="item-aligned"
          data-testid="item-aligned-content"
        >
          <SelectScrollUpButton
            className="custom-scroll-up"
            data-testid="custom-scroll-up"
          />
          <SelectItem value="todo">To Do</SelectItem>
          <SelectScrollDownButton
            className="custom-scroll-down"
            data-testid="custom-scroll-down"
          />
        </SelectContent>
      </Select>,
    );

    const content = screen.getByTestId("item-aligned-content");
    expect(content).not.toHaveClass("data-[side=bottom]:translate-y-1");
    expect(screen.getByRole("option", { name: "To Do" }))
      .toBeInTheDocument();
    expect(screen.queryByTestId("custom-scroll-up")).not.toBeInTheDocument();
    expect(screen.queryByTestId("custom-scroll-down")).not.toBeInTheDocument();
  });
